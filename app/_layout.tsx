import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { supabase } from "@/lib/supabase";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const c = useBrandColors();
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Validate the session is still valid with the server
        supabase.auth.getUser().then(({ error }) => {
          if (error) {
            // Session is stale/expired — clear it
            supabase.auth.signOut().finally(() => {
              setSession(null);
              setIsReady(true);
            });
          } else {
            setSession(data.session);
            setIsReady(true);
          }
        });
      } else {
        setIsReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  usePushNotifications(session?.user?.id);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === ("(auth)" as string);
    const hasSession = !!session;

    if (!hasSession && !inAuthGroup) {
      router.replace("/(auth)/sign-in" as Href);
    } else if (hasSession && inAuthGroup) {
      router.replace("/(main)" as Href);
    }
  }, [session, segments, isReady]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
