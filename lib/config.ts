export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
  webAppUrl: process.env.EXPO_PUBLIC_WEBAPP_URL ?? "http://localhost:3000",
} as const;
