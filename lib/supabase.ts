import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { Config } from "./config";

// expo-secure-store is native-only; during eas update's static render
// (Node.js) the native module isn't available, so we lazy-import and
// fall back to a no-op adapter to keep the export from crashing.
const secureStoreAdapter =
  Platform.OS === "web"
    ? undefined
    : {
        getItem: async (key: string) => {
          const SecureStore = await import("expo-secure-store");
          return SecureStore.getItemAsync(key);
        },
        setItem: async (key: string, value: string) => {
          const SecureStore = await import("expo-secure-store");
          await SecureStore.setItemAsync(key, value);
        },
        removeItem: async (key: string) => {
          const SecureStore = await import("expo-secure-store");
          await SecureStore.deleteItemAsync(key);
        },
      };

export const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
