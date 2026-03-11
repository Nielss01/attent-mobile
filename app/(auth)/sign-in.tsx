import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";

export default function SignInScreen() {
  const router = useRouter();
  const c = useBrandColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
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
      await signInWithEmail(email, password);
      router.replace("/(main)" as Href);
    } catch (err: any) {
      setError(err.message ?? "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer title="Welcome back" subtitle="Sign in to your account">
      {/* form — space-y-4 (16px) is handled by AuthInput's marginBottom */}
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

      {/* Forgot password link — text-xs text-primary */}
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

      {/* Footer — text-sm text-muted-foreground mt-6 */}
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
