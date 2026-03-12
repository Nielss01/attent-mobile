import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { ensureUserAndProfile } from "@/lib/auth";

/**
 * Catches the attent://auth/callback deep link when WebBrowser
 * doesn't fully intercept it (e.g. on Android where Chrome Custom Tabs
 * hand off to the OS instead of returning the URL to openAuthSessionAsync).
 *
 * Parses access_token / refresh_token from the URL fragment, establishes
 * the Supabase session, and redirects into the app.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const initialUrl = await Linking.getInitialURL();
      const url = initialUrl ?? "";

      const queryIndex = url.indexOf("?");
      if (queryIndex !== -1) {
        const queryParams = new URLSearchParams(url.substring(queryIndex + 1));
        if (queryParams.get("error")) {
          router.replace("/(auth)/sign-in" as Href);
          return;
        }
      }

      const hashIndex = url.indexOf("#");
      if (hashIndex !== -1) {
        const fragment = new URLSearchParams(url.substring(hashIndex + 1));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.user) {
            await ensureUserAndProfile(data.user);
            router.replace("/(main)" as Href);
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/(main)" as Href);
      } else {
        router.replace("/(auth)/sign-in" as Href);
      }
    } catch {
      router.replace("/(auth)/sign-in" as Href);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
