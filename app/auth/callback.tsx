import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { supabase } from "@/lib/supabase";

/**
 * Catches the attent://auth/callback deep link when WebBrowser
 * doesn't fully intercept it (e.g. on some Android configurations).
 * Extracts tokens from the URL fragment and sets the Supabase session,
 * then redirects to the main app or back to sign-in on failure.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ error?: string }>();

  useEffect(() => {
    if (params.error) {
      router.replace("/(auth)/sign-in" as Href);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/(main)" as Href);
      } else {
        router.replace("/(auth)/sign-in" as Href);
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
