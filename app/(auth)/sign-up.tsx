import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { signUpWithEmail } from "@/lib/auth";

export default function SignUpScreen() {
  const router = useRouter();
  const c = useBrandColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(name, email, password);
      router.replace("/(main)" as Href);
    } catch (err: any) {
      setError(err.message ?? "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer title="Create your account" subtitle="Get started for free">
      <AuthInput
        label="Full name"
        placeholder="Jan Meijer"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
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
      <AuthInput
        label="Confirm password"
        placeholder="••••••••"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {error && (
        <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>
      )}

      <AuthButton
        title="Create Account"
        onPress={handleSignUp}
        loading={loading}
      />

      <AuthDivider />

      <AuthButton
        title="Continue with Google"
        variant="outline"
        onPress={() =>
          Alert.alert(
            "Google Sign Up",
            "Google OAuth requires a custom URL scheme and web browser redirect. Configure this in your Supabase dashboard.",
          )
        }
        icon={<GoogleIcon size={16} />}
      />

      {/* Footer — text-sm text-muted-foreground mt-6 */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.mutedForeground }]}>
          Already have an account?{" "}
        </Text>
        <Link href={"/(auth)/sign-in" as Href} asChild>
          <Pressable>
            <Text style={[styles.footerLink, { color: c.primary }]}>
              Sign in
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
