import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Alert, Platform } from "react-native";

const BIOMETRIC_ENABLED_KEY = "biometrics_enabled";
const BIOMETRIC_REFRESH_TOKEN_KEY = "biometrics_refresh_token";

export type BiometricType = "faceid" | "fingerprint" | "iris" | "none";

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function getBiometricType(): Promise<BiometricType> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (Platform.OS === "ios") {
    // iOS: Face ID takes priority (modern devices), then Touch ID
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "faceid";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "fingerprint";
  } else {
    // Android: fingerprint is the dominant biometric; many devices report
    // both face and fingerprint as supported hardware even when only
    // fingerprint is actually enrolled.
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "fingerprint";
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "faceid";
  }

  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "iris";
  return "none";
}

export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case "faceid":
      return Platform.OS === "ios" ? "Face ID" : "Face Unlock";
    case "fingerprint":
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    case "iris":
      return "Iris";
    default:
      return "Biometrics";
  }
}

export async function authenticate(promptMessage?: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage ?? "Verify your identity",
    fallbackLabel: "Use passcode",
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === "true";
}

export async function enableBiometricLogin(): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
}

export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY);
}

/**
 * Stash the refresh token so biometric re-entry works after sign-out.
 * Only call this when biometrics are enabled.
 */
export async function stashSessionForBiometric(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY, refreshToken);
}

export async function getStashedRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY);
}

export async function clearStashedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY);
}

export async function hasBiometricSession(): Promise<boolean> {
  const [enabled, token] = await Promise.all([
    isBiometricLoginEnabled(),
    SecureStore.getItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY),
  ]);
  return enabled && !!token;
}

/**
 * Prompt the user to enable biometric login after sign-in.
 * Pass the current refresh token so it gets stashed immediately on enrollment.
 */
export async function offerBiometricEnrollment(refreshToken?: string): Promise<void> {
  const available = await isBiometricAvailable();
  if (!available) return;

  const alreadyEnabled = await isBiometricLoginEnabled();
  if (alreadyEnabled) {
    if (refreshToken) await stashSessionForBiometric(refreshToken);
    return;
  }

  const type = await getBiometricType();
  const label = getBiometricLabel(type);

  return new Promise((resolve) => {
    Alert.alert(
      `Enable ${label}?`,
      `Would you like to use ${label} to unlock Attent next time?`,
      [
        { text: "Not Now", style: "cancel", onPress: () => resolve() },
        {
          text: "Enable",
          onPress: async () => {
            const verified = await authenticate(`Confirm ${label} setup`);
            if (verified) {
              await enableBiometricLogin();
              if (refreshToken) await stashSessionForBiometric(refreshToken);
            }
            resolve();
          },
        },
      ],
    );
  });
}
