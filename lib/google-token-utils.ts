import { supabase } from "./supabase";
import { GOOGLE_SCOPES } from "./google-oauth-scopes";

interface TokenInfoResponse {
  scope?: string;
  expires_in?: number;
  error_description?: string;
}

export async function getGrantedScopes(accessToken: string): Promise<Set<string>> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!res.ok) return new Set();
  const data = (await res.json()) as TokenInfoResponse;
  return new Set((data.scope ?? "").split(" "));
}

export async function storeProviderTokens(
  userId: string,
  providerToken: string,
  providerRefreshToken: string | null,
  grantedScopes: Set<string>,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const tables: string[] = [];

  if (grantedScopes.has(GOOGLE_SCOPES.CONTACTS_READONLY)) {
    tables.push("user_google_contacts_tokens");
  }
  if (grantedScopes.has(GOOGLE_SCOPES.CALENDAR_READONLY)) {
    tables.push("user_google_calendar_tokens");
  }

  if (tables.length === 0) return;

  if (providerRefreshToken) {
    // First authorisation: upsert the full row including refresh token
    const row = {
      user_id: userId,
      access_token: providerToken,
      refresh_token: providerRefreshToken,
      token_expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    };
    await Promise.all(
      tables.map((t) => supabase.from(t).upsert(row, { onConflict: "user_id" })),
    );
  } else {
    // Returning user: only refresh the access token on existing rows
    await Promise.all(
      tables.map((t) =>
        supabase
          .from(t)
          .update({ access_token: providerToken, token_expires_at: expiresAt })
          .eq("user_id", userId),
      ),
    );
  }
}
