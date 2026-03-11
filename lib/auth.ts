import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

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

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut() {
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
