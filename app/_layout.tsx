import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import type { Session } from "@supabase/supabase-js";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { supabase } from "@/lib/supabase";
import {
  authenticate,
  getBiometricLabel,
  getBiometricType,
  isBiometricLoginEnabled,
  stashSessionForBiometric,
  type BiometricType,
} from "@/lib/biometrics";
import { FaceIdIcon } from "@/components/auth/FaceIdIcon";
import { FingerprintIcon } from "@/components/auth/FingerprintIcon";
import { useOTAUpdates } from "@/hooks/use-ota-updates";
import { UpdatePrompt } from "@/components/UpdatePrompt";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const c = useBrandColors();
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [biometricTypeState, setBiometricTypeState] = useState<BiometricType>("none");

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (data.session) {
          const userResult = await supabase.auth.getUser();
          if (userResult.error) {
            // Use local scope so the server-side refresh token (and the
            // stashed biometric token) stays valid for biometric re-entry.
            await supabase.auth.signOut({ scope: "local" }).catch(() => {});
            setSession(null);
            setIsReady(true);
            return;
          }
          setSession(data.session);

          const bioEnabled = await isBiometricLoginEnabled();
          if (bioEnabled) {
            const type = await getBiometricType();
            setBiometricTypeState(type);
            setBiometricLabel(getBiometricLabel(type));
            setBiometricLocked(true);
            setIsReady(true);
            const success = await authenticate(`Unlock Attent with ${getBiometricLabel(type)}`);
            if (success) {
              setBiometricLocked(false);
            }
          } else {
            setIsReady(true);
          }
          return;
        }
        setIsReady(true);
      })
      .catch(() => {
        setIsReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      // Keep the stashed biometric token in sync whenever Supabase
      // rotates the refresh token (happens on every auto-refresh).
      if (
        newSession?.refresh_token &&
        (event === "TOKEN_REFRESHED" || event === "SIGNED_IN")
      ) {
        const bioEnabled = await isBiometricLoginEnabled();
        if (bioEnabled) {
          await stashSessionForBiometric(newSession.refresh_token);
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  usePushNotifications(session?.user?.id);
  const otaUpdates = useOTAUpdates();

  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    if (!isReady || biometricLocked) return;

    const inAuthGroup = segments[0] === ("(auth)" as string);
    const hasSession = !!session;

    if (!hasSession && !inAuthGroup) {
      router.replace("/(auth)/sign-in" as Href);
    } else if (hasSession && inAuthGroup) {
      router.replace("/(main)" as Href);
    }
  }, [session, segments, isReady, biometricLocked]);

  const handleBiometricRetry = async () => {
    const success = await authenticate(`Unlock Attent with ${biometricLabel}`);
    if (success) {
      setBiometricLocked(false);
    }
  };

  if (!isReady) {
    return (
      <View style={[layoutStyles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (biometricLocked) {
    return (
      <View style={[layoutStyles.centered, { backgroundColor: c.background }]}>
        <View style={layoutStyles.lockIconContainer}>
          {biometricTypeState === "faceid" ? (
            <FaceIdIcon size={48} color={c.primary} />
          ) : (
            <FingerprintIcon size={48} color={c.primary} />
          )}
        </View>
        <Text style={[layoutStyles.lockTitle, { color: c.foreground }]}>
          App Locked
        </Text>
        <Text style={[layoutStyles.lockSubtitle, { color: c.mutedForeground }]}>
          Authenticate to continue
        </Text>
        <Pressable
          style={({ pressed }) => [
            layoutStyles.unlockButton,
            { backgroundColor: pressed ? c.primaryHover : c.primary },
          ]}
          onPress={handleBiometricRetry}
        >
          <Text style={[layoutStyles.unlockButtonText, { color: c.primaryForeground }]}>
            Unlock with {biometricLabel}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
      <UpdatePrompt {...otaUpdates} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const layoutStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lockIconContainer: {
    marginBottom: 20,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  lockSubtitle: {
    fontSize: 14,
    marginBottom: 32,
  },
  unlockButton: {
    height: 44,
    paddingHorizontal: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  unlockButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
});
