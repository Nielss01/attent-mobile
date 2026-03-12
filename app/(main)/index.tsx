import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  ShouldStartLoadRequest,
} from "react-native-webview/lib/WebViewTypes";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { Config } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { isBiometricLoginEnabled, stashSessionForBiometric } from "@/lib/biometrics";
import { consumePendingMoment, onMomentDeepLink } from "@/lib/deep-link";
import { registerForPushNotifications, savePushToken } from "@/lib/notifications";

const AUTH_INTERCEPT_PATHS = ["/auth/sign-in", "/auth/sign-up"];
const GOOGLE_CONNECT_PATHS = [
  "/api/google-calendar/connect",
  "/api/google-contacts/connect",
];

const EXTERNAL_URL_PREFIXES = [
  "https://wa.me/",
  "https://api.whatsapp.com/",
  "whatsapp://",
  "https://www.facebook.com/sharer/",
  "instagram://",
  "https://instagram.com/",
  "mailto:",
  "tel:",
  "sms:",
];

function isExternalUrl(url: string): boolean {
  return EXTERNAL_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export default function WebViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const c = useBrandColors();

  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const webViewReady = useRef(false);

  const navigateToMoment = useCallback((momentId: string) => {
    const url = `${Config.webAppUrl}/profile?view=editMoments&momentId=${encodeURIComponent(momentId)}`;
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(url)}; true;`,
    );
  }, []);

  useEffect(() => {
    buildSessionUrl();
  }, []);

  useEffect(() => {
    return onMomentDeepLink((momentId) => {
      if (webViewReady.current) {
        navigateToMoment(momentId);
      }
    });
  }, [navigateToMoment]);

  async function buildSessionUrl() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      router.replace("/(auth)/sign-in" as Href);
      return;
    }
    const url =
      `${Config.webAppUrl}/auth/native-callback` +
      `?access_token=${encodeURIComponent(session.access_token)}` +
      `&refresh_token=${encodeURIComponent(session.refresh_token)}`;
    setWebViewUrl(url);
  }

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      try {
        const url = new URL(navState.url);
        const path = url.pathname;

        if (AUTH_INTERCEPT_PATHS.some((p) => path.startsWith(p))) {
          webViewRef.current?.stopLoading();
          handleNativeSignOut();
        }
      } catch {
        // invalid URL, ignore
      }
    },
    [],
  );

  async function handleNativeSignOut(webViewRefreshToken?: string) {
    try {
      await signOut(webViewRefreshToken);
    } catch {
      // best-effort
    }
    router.replace("/(auth)/sign-in" as Href);
  }

  async function handleTokenSync(accessToken: string, refreshToken: string) {
    try {
      // Feed the WebView's fresh tokens into the native Supabase client so
      // native operations (Google Connect, push registration) have valid
      // credentials, and the biometric stash stays current.
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      const bioEnabled = await isBiometricLoginEnabled();
      if (bioEnabled) {
        await stashSessionForBiometric(refreshToken);
      }
    } catch {
      // best-effort
    }
  }

  const handleError = useCallback((event: WebViewErrorEvent) => {
    setError(event.nativeEvent.description || "Failed to load the app.");
    setIsLoading(false);
  }, []);

  const handleHttpError = useCallback((event: WebViewHttpErrorEvent) => {
    const status = event.nativeEvent.statusCode;
    if (status >= 500) {
      setError(`Server error (${status}). Please try again.`);
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    buildSessionUrl();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === "sign-out") {
          handleNativeSignOut(message.refresh_token);
        } else if (message.type === "token-sync" && message.access_token && message.refresh_token) {
          handleTokenSync(message.access_token, message.refresh_token);
        } else if (message.type === "request-push-permission") {
          handlePushPermissionRequest();
        } else if (message.type === "open-external-url" && message.url) {
          Linking.openURL(message.url).catch((err) =>
            console.warn("[WebView] Could not open external URL:", message.url, err),
          );
        }
      } catch {
        // not JSON, ignore
      }
    },
    [],
  );

  const handlePushPermissionRequest = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (userId) {
          await savePushToken(userId, token);
        }
        webViewRef.current?.injectJavaScript(
          `window.dispatchEvent(new CustomEvent('native-push-result', { detail: { success: true } })); true;`,
        );
      } else {
        webViewRef.current?.injectJavaScript(
          `window.dispatchEvent(new CustomEvent('native-push-result', { detail: { success: false, reason: 'denied' } })); true;`,
        );
      }
    } catch (err) {
      console.error("[WebView] Push permission request error:", err);
      webViewRef.current?.injectJavaScript(
        `window.dispatchEvent(new CustomEvent('native-push-result', { detail: { success: false, reason: 'error' } })); true;`,
      );
    }
  }, []);

  const googleConnectInProgress = useRef(false);

  const handleGoogleConnect = useCallback(async (connectPath: string) => {
    if (googleConnectInProgress.current) return;
    googleConnectInProgress.current = true;

    const isContacts = connectPath.includes("google-contacts");
    const tokenTable = isContacts
      ? "user_google_contacts_tokens"
      : "user_google_calendar_tokens";
    const errorKey = isContacts ? "gcontacts_error" : "gcal_error";
    const label = isContacts ? "GContacts" : "GCal";

    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const connectUrl =
        `${Config.webAppUrl}${connectPath}` +
        `?access_token=${encodeURIComponent(session.access_token)}` +
        `&native=1`;

      const returnUrl = Linking.createURL("gcal-callback");

      const result = await WebBrowser.openAuthSessionAsync(connectUrl, returnUrl);

      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url);
        const googleAccessToken = parsed.searchParams.get("google_access_token");
        const googleRefreshToken = parsed.searchParams.get("google_refresh_token");
        const expiresIn = parsed.searchParams.get("expires_in");
        const oauthError =
          parsed.searchParams.get(errorKey) ??
          parsed.searchParams.get("gcal_error") ??
          parsed.searchParams.get("gcontacts_error");

        if (oauthError) {
          console.warn(`[${label}] OAuth error:`, oauthError);
        } else if (googleAccessToken && googleRefreshToken && expiresIn) {
          const expiresAt = new Date(
            Date.now() + Number(expiresIn) * 1000,
          ).toISOString();

          await supabase.from(tokenTable).upsert(
            {
              user_id: session.user.id,
              access_token: googleAccessToken,
              refresh_token: googleRefreshToken,
              token_expires_at: expiresAt,
              connected_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        }
      }

      webViewRef.current?.reload();
    } catch (err) {
      console.error(`[${label}] Connect error:`, err);
    } finally {
      googleConnectInProgress.current = false;
    }
  }, []);

  const handleShouldStartLoad = useCallback(
    (event: ShouldStartLoadRequest): boolean => {
      const raw = event.url;

      if (isExternalUrl(raw)) {
        Linking.openURL(raw).catch((err) =>
          console.warn("[WebView] Could not open external URL:", raw, err),
        );
        return false;
      }

      try {
        const url = new URL(raw);
        const matchedPath = GOOGLE_CONNECT_PATHS.find(
          (p) => url.pathname === p,
        );
        if (matchedPath) {
          handleGoogleConnect(matchedPath);
          return false;
        }
      } catch {
        // invalid URL, allow
      }
      return true;
    },
    [handleGoogleConnect],
  );

  if (error) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: c.background, paddingTop: insets.top },
        ]}
      >
        <Text style={[styles.errorTitle, { color: c.foreground }]}>
          Something went wrong
        </Text>
        <Text style={[styles.errorMessage, { color: c.mutedForeground }]}>
          {error}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: pressed ? c.primaryHover : c.primary },
          ]}
          onPress={handleRetry}
        >
          <Text style={[styles.retryText, { color: c.primaryForeground }]}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!webViewUrl) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const webView = (
    <WebView
      ref={webViewRef}
      source={{ uri: webViewUrl }}
      style={{ flex: 1, backgroundColor: c.background }}
      onNavigationStateChange={handleNavigationStateChange}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      onError={handleError}
      onHttpError={handleHttpError}
      onMessage={handleMessage}
      onLoadStart={() => setIsLoading(true)}
      onLoadEnd={() => {
        setIsLoading(false);
        if (!webViewReady.current) {
          webViewReady.current = true;
          const pending = consumePendingMoment();
          if (pending) navigateToMoment(pending);
        }
      }}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      allowsBackForwardNavigationGestures
      sharedCookiesEnabled
      renderLoading={() => (
        <View style={[styles.centered, { backgroundColor: c.background }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      )}
      injectedJavaScript={`
        window.isNativeApp = true;
        window.nativeSafeAreaBottom = ${insets.bottom};
        document.documentElement.style.setProperty(
          '--native-safe-area-bottom', '${insets.bottom}px'
        );

        (function() {
          var externalPrefixes = ${JSON.stringify(EXTERNAL_URL_PREFIXES)};
          var lastSentUrl = '';
          var lastSentAt = 0;

          function isExternal(url) {
            if (!url || typeof url !== 'string') return false;
            for (var i = 0; i < externalPrefixes.length; i++) {
              if (url.indexOf(externalPrefixes[i]) === 0) return true;
            }
            return false;
          }

          function sendExternalUrl(url) {
            var now = Date.now();
            if (url === lastSentUrl && now - lastSentAt < 2000) return;
            lastSentUrl = url;
            lastSentAt = now;
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'open-external-url', url: url })
            );
          }

          var origOpen = window.open;
          window.open = function(url) {
            if (typeof url === 'string' && isExternal(url)) {
              sendExternalUrl(url);
              return null;
            }
            if (!url || url === 'about:blank') {
              return null;
            }
            return origOpen.apply(this, arguments);
          };

          var origAssign = window.location.assign;
          Object.defineProperty(window.location, 'assign', {
            configurable: true,
            value: function(url) {
              if (typeof url === 'string' && isExternal(url)) {
                sendExternalUrl(url);
                return;
              }
              return origAssign.call(window.location, url);
            }
          });
        })();

        (function() {
          var authPaths = ['/auth/sign-in', '/auth/sign-up'];
          var lastUrl = location.href;

          function checkUrl() {
            if (location.href !== lastUrl) {
              lastUrl = location.href;
              try {
                var path = new URL(location.href).pathname;
                for (var i = 0; i < authPaths.length; i++) {
                  if (path.indexOf(authPaths[i]) === 0) {
                    window.ReactNativeWebView.postMessage(
                      JSON.stringify({ type: 'sign-out' })
                    );
                    return;
                  }
                }
              } catch(e) {}
            }
          }

          var origPush = history.pushState;
          var origReplace = history.replaceState;
          history.pushState = function() {
            origPush.apply(this, arguments);
            checkUrl();
          };
          history.replaceState = function() {
            origReplace.apply(this, arguments);
            checkUrl();
          };
          window.addEventListener('popstate', checkUrl);
        })();
        true;
      `}
    />
  );

  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top,
            backgroundColor: c.background,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {webView}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: c.background,
        },
      ]}
    >
      {webView}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    height: 40,
    paddingHorizontal: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
