import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, type Href } from "expo-router";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordScreen() {
  const c = useBrandColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthContainer
        title="Check your email"
        subtitle="We sent a password reset link"
      >
        <View style={styles.sentContainer}>
          <Text style={[styles.sentText, { color: c.mutedForeground }]}>
            If an account exists for{" "}
            <Text style={{ fontWeight: "600" }}>{email}</Text>, you will receive
            an email with instructions to reset your password.
          </Text>
          <Link href={"/(auth)/sign-in" as Href} asChild>
            <Pressable style={styles.backLink}>
              <Text style={[styles.linkText, { color: c.primary }]}>
                Back to sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer
      title="Reset password"
      subtitle="Enter your email to receive a reset link"
    >
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {error && (
        <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>
      )}

      <AuthButton
        title="Send Reset Link"
        onPress={handleReset}
        loading={loading}
      />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.mutedForeground }]}>
          Remember your password?{" "}
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
  sentContainer: {
    alignItems: "center",
    gap: 16,
  },
  sentText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  backLink: {
    marginTop: 8,
  },
  linkText: {
    fontWeight: "500",
    fontSize: 14,
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
