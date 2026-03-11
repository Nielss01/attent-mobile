import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { FaceIdIcon } from "@/components/auth/FaceIdIcon";
import { FingerprintIcon } from "@/components/auth/FingerprintIcon";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  authenticate,
  clearStashedSession,
  getBiometricLabel,
  getBiometricType,
  getStashedRefreshToken,
  hasBiometricSession,
  offerBiometricEnrollment,
  stashSessionForBiometric,
  type BiometricType,
} from "@/lib/biometrics";

export default function SignInScreen() {
  const router = useRouter();
  const c = useBrandColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");

  useEffect(() => {
    (async () => {
      const ready = await hasBiometricSession();
      if (ready) {
        const type = await getBiometricType();
        setBiometricType(type);
        setBiometricReady(true);
      }
    })();
  }, []);

  const handleBiometricSignIn = async () => {
    setError(null);
    setBiometricLoading(true);
    try {
      const label = getBiometricLabel(biometricType);
      const verified = await authenticate(`Sign in with ${label}`);
      if (!verified) {
        setBiometricLoading(false);
        return;
      }

      const refreshToken = await getStashedRefreshToken();
      if (!refreshToken) {
        setError("Biometric session expired. Please sign in with your credentials.");
        await clearStashedSession();
        setBiometricReady(false);
        setBiometricLoading(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (sessionError || !data.session) {
        setError("Session expired. Please sign in with your credentials.");
        await clearStashedSession();
        setBiometricReady(false);
        setBiometricLoading(false);
        return;
      }

      await stashSessionForBiometric(data.session.refresh_token);
      router.replace("/(main)" as Href);
    } catch (err: any) {
      setError(err.message ?? "Biometric sign-in failed.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const sessionData = await signInWithGoogle();
      await offerBiometricEnrollment(sessionData.session?.refresh_token);
      router.replace("/(main)" as Href);
    } catch (err: any) {
      if (err.message !== "Google sign-in was cancelled") {
        setError(err.message ?? "Google sign-in failed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await signInWithEmail(email, password);
      await offerBiometricEnrollment(data.session?.refresh_token);
      router.replace("/(main)" as Href);
    } catch (err: any) {
      setError(err.message ?? "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const biometricLabel = getBiometricLabel(biometricType);

  return (
    <AuthContainer title="Welcome back" subtitle="Sign in to your account">
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthInput
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && (
        <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>
      )}

      <AuthButton title="Sign In" onPress={handleSignIn} loading={loading} />

      {biometricReady && (
        <Pressable
          onPress={handleBiometricSignIn}
          disabled={biometricLoading}
          style={({ pressed }) => [
            styles.biometricButton,
            {
              borderColor: c.input,
              opacity: biometricLoading ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {biometricType === "faceid" ? (
            <FaceIdIcon size={18} color={c.foreground} />
          ) : (
            <FingerprintIcon size={18} color={c.foreground} />
          )}
          <Text style={[styles.biometricText, { color: c.foreground }]}>
            Sign in with {biometricLabel}
          </Text>
        </Pressable>
      )}

      <Link href={"/(auth)/reset-password" as Href} asChild>
        <Pressable style={styles.forgotLink}>
          <Text style={[styles.forgotText, { color: c.primary }]}>
            Forgot password?
          </Text>
        </Pressable>
      </Link>

      <AuthDivider />

      <AuthButton
        title="Continue with Google"
        variant="outline"
        onPress={handleGoogleSignIn}
        loading={googleLoading}
        icon={<GoogleIcon size={16} />}
      />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.mutedForeground }]}>
          Don&apos;t have an account?{" "}
        </Text>
        <Link href={"/(auth)/sign-up" as Href} asChild>
          <Pressable>
            <Text style={[styles.footerLink, { color: c.primary }]}>
              Sign up
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthContainer>
  );
}

const styles = StyleSheet.create({
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  forgotLink: {
    alignSelf: "center",
    marginTop: 12,
  },
  forgotText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "500",
  },
});
