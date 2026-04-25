import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";
import {
  clearStashedSession,
  disableBiometricLogin,
  isBiometricLoginEnabled,
  stashSessionForBiometric,
} from "./biometrics";
import { GOOGLE_SSO_SCOPES } from "./google-oauth-scopes";
import { getGrantedScopes, storeProviderTokens } from "./google-token-utils";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) await ensureUserAndProfile(data.user);
  return data;
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  if (data.user) await ensureUserAndProfile(data.user);
  return data;
}

export async function signInWithGoogle() {
  const redirectUrl = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      scopes: GOOGLE_SSO_SCOPES,
      queryParams: { access_type: "offline" },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("No OAuth URL returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled");
  }

  const url = result.url;

  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    const queryParams = new URLSearchParams(url.substring(queryIndex + 1));
    const oauthError = queryParams.get("error");
    if (oauthError) {
      const description = queryParams.get("error_description") ?? oauthError;
      throw new Error(`Google sign-in failed: ${description}`);
    }
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) throw new Error("No session tokens in redirect");

  const params = new URLSearchParams(url.substring(hashIndex + 1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const providerToken = params.get("provider_token");
  const providerRefreshToken = params.get("provider_refresh_token");

  if (!accessToken || !refreshToken) {
    throw new Error("Missing session tokens in redirect");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) throw sessionError;
  if (sessionData.user) await ensureUserAndProfile(sessionData.user);

  if (providerToken && sessionData.user) {
    try {
      const grantedScopes = await getGrantedScopes(providerToken);
      await storeProviderTokens(sessionData.user.id, providerToken, providerRefreshToken ?? null, grantedScopes);
    } catch {
      // Token storage is best-effort; user can connect via Settings later
    }
  }

  return sessionData;
}

export async function signInWithApple() {
  const rawNonce = Math.random().toString(36).substring(2, 18);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error("Apple Sign-In failed: no identity token returned");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

  // Apple only provides name on the very first sign-in; capture it before ensureUserAndProfile
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ");

  if (fullName && data.user && !data.user.user_metadata?.full_name) {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    const { data: refreshed } = await supabase.auth.getUser();
    if (refreshed.user) await ensureUserAndProfile(refreshed.user);
  } else if (data.user) {
    await ensureUserAndProfile(data.user);
  }

  return data;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut(webViewRefreshToken?: string) {
  const bioEnabled = await isBiometricLoginEnabled();
  if (bioEnabled) {
    const tokenToStash =
      webViewRefreshToken ??
      (await supabase.auth.getSession()).data.session?.refresh_token;
    if (tokenToStash) {
      await stashSessionForBiometric(tokenToStash);
    }
    // Use 'local' scope so the refresh token stays valid server-side,
    // allowing biometric re-entry with the stashed token.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export async function signOutCompletely() {
  await disableBiometricLogin();
  await clearStashedSession();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

const DEFAULT_GROUPS = [
  {
    slug: "friends",
    name: "Friends",
    color: "green",
    can_view_birthday: true,
    can_view_address: false,
    can_view_moments: true,
    can_view_wishlist: true,
    can_view_children_birthdays: true,
    sort_order: 0,
  },
  {
    slug: "family",
    name: "Family",
    color: "blue",
    can_view_birthday: true,
    can_view_address: true,
    can_view_moments: true,
    can_view_wishlist: true,
    can_view_children_birthdays: true,
    sort_order: 1,
  },
  {
    slug: "colleagues",
    name: "Colleagues",
    color: "amber",
    can_view_birthday: true,
    can_view_address: false,
    can_view_moments: false,
    can_view_wishlist: false,
    can_view_children_birthdays: false,
    sort_order: 2,
  },
  {
    slug: "acquaintances",
    name: "Acquaintances",
    color: "slate",
    can_view_birthday: true,
    can_view_address: false,
    can_view_moments: false,
    can_view_wishlist: false,
    can_view_children_birthdays: false,
    sort_order: 3,
  },
] as const;

function randomSuffix(len = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function ensureUserAndProfile(authUser: User) {
  const fullName =
    (authUser.user_metadata?.full_name as string) ??
    (authUser.user_metadata?.name as string) ??
    "";

  const avatarUrl: string | null = authUser.user_metadata?.avatar_url ?? null;

  const [{ data: existingUser }, { data: existingProfile }] = await Promise.all([
    supabase.from("users").select("id").eq("id", authUser.id).maybeSingle(),
    supabase.from("profiles").select("id, user_id").eq("user_id", authUser.id).maybeSingle(),
  ]);

  const spaceIdx = fullName.indexOf(" ");
  const firstName = spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName;
  const lastName = spaceIdx > 0 ? fullName.slice(spaceIdx + 1) : "";

  if (existingUser) {
    await supabase.from("users").update({ email: authUser.email! }).eq("id", authUser.id);
  } else {
    await supabase.from("users").insert({
      id: authUser.id,
      email: authUser.email!,
      full_name: fullName,
    });
  }

  if (!existingProfile) {
    const baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
    let username = baseUsername;
    let inserted = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: insertErr } = await supabase.from("profiles").insert({
        user_id: authUser.id,
        first_name: firstName,
        last_name: lastName,
        username,
        avatar_url: avatarUrl,
        email: authUser.email?.toLowerCase(),
      });

      if (!insertErr) {
        inserted = true;
        break;
      }

      if (insertErr.code === "23505") {
        username = `${baseUsername}${randomSuffix()}`;
        continue;
      }

      throw insertErr;
    }

    if (!inserted) {
      await supabase.from("profiles").insert({
        user_id: authUser.id,
        first_name: firstName,
        last_name: lastName,
        username: `${baseUsername}${randomSuffix(8)}`,
        avatar_url: avatarUrl,
        email: authUser.email?.toLowerCase(),
      });
    }
  }

  const { count: groupCount } = await supabase
    .from("user_groups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authUser.id);

  if (!groupCount) {
    await supabase.from("user_groups").upsert(
      DEFAULT_GROUPS.map((group) => ({
        user_id: authUser.id,
        ...group,
      })),
      { onConflict: "user_id,slug", ignoreDuplicates: true },
    );
  }
}
