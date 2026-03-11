import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";
import {
  clearStashedSession,
  disableBiometricLogin,
  isBiometricLoginEnabled,
  stashSessionForBiometric,
} from "./biometrics";

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

  if (!accessToken || !refreshToken) {
    throw new Error("Missing session tokens in redirect");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) throw sessionError;
  if (sessionData.user) await ensureUserAndProfile(sessionData.user);

  return sessionData;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut() {
  const bioEnabled = await isBiometricLoginEnabled();
  if (bioEnabled) {
    // Grab the latest refresh token before clearing local state.
    const { data } = await supabase.auth.getSession();
    if (data.session?.refresh_token) {
      await stashSessionForBiometric(data.session.refresh_token);
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
    color: "bg-accent/20 text-accent-foreground",
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
    color: "bg-primary/15 text-primary",
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
    color: "bg-muted text-muted-foreground",
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
    color: "bg-secondary text-secondary-foreground",
    can_view_birthday: true,
    can_view_address: false,
    can_view_moments: false,
    can_view_wishlist: false,
    can_view_children_birthdays: false,
    sort_order: 3,
  },
] as const;

async function ensureUserAndProfile(authUser: User) {
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
    const defaultUsername = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, "");
    await supabase.from("profiles").insert({
      user_id: authUser.id,
      first_name: firstName,
      last_name: lastName,
      username: defaultUsername,
      avatar_url: avatarUrl,
      email: authUser.email?.toLowerCase(),
    });
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
