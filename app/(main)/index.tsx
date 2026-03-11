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
} from "react-native-webview/lib/WebViewTypes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { Config } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";

const AUTH_INTERCEPT_PATHS = ["/auth/sign-in", "/auth/sign-up"];

export default function WebViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const c = useBrandColors();

  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    buildSessionUrl();
  }, []);

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

  async function handleNativeSignOut() {
    try {
      await signOut();
    } catch {
      // best-effort
    }
    router.replace("/(auth)/sign-in" as Href);
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
          handleNativeSignOut();
        }
      } catch {
        // not JSON, ignore
      }
    },
    [],
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
      onError={handleError}
      onHttpError={handleHttpError}
      onMessage={handleMessage}
      onLoadStart={() => setIsLoading(true)}
      onLoadEnd={() => setIsLoading(false)}
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

        // Monitor URL changes (catches SPA navigations that
        // onNavigationStateChange may miss)
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

          // Patch pushState/replaceState to detect SPA navigations
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
          { paddingTop: insets.top, backgroundColor: c.background },
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
        { paddingTop: insets.top, backgroundColor: c.background },
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
