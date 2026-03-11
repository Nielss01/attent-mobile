import { Platform } from "react-native";

/**
 * Blossom theme — matches the attent-v2 web app's default CSS variables.
 *
 * Light ← :root / .blossom   Dark ← .dusk
 */
export const BrandColors = {
  light: {
    background: "#f9f5f1",
    foreground: "#26222a",
    card: "#fcfaf8",
    cardForeground: "#26222a",
    primary: "#df90c5",
    primaryHover: "#da4eab",
    primaryForeground: "#ffffff",
    secondary: "#f0e4ec",
    secondaryForeground: "#3d3544",
    muted: "#ede5ea",
    mutedForeground: "#736d79",
    border: "#e5dce2",
    input: "#e0d7dd",
    ring: "#df90c5",
    destructive: "#dc2828",
    destructiveForeground: "#ffffff",
    accent: "#b2e636",
    accentForeground: "#26222a",
    success: "#30b87a",
    successForeground: "#ffffff",
  },
  dark: {
    background: "#1a1520",
    foreground: "#f0eaf0",
    card: "#231d2a",
    cardForeground: "#f0eaf0",
    primary: "#df90c5",
    primaryHover: "#da4eab",
    primaryForeground: "#ffffff",
    secondary: "#2e2636",
    secondaryForeground: "#d4c8d4",
    muted: "#2a2330",
    mutedForeground: "#9a9099",
    border: "#3a2f42",
    input: "#352c3c",
    ring: "#df90c5",
    destructive: "#dc2828",
    destructiveForeground: "#ffffff",
    accent: "#b2e636",
    accentForeground: "#1a1520",
    success: "#30b87a",
    successForeground: "#ffffff",
  },
} as const;

export const Colors = {
  light: {
    text: BrandColors.light.foreground,
    background: BrandColors.light.background,
    tint: BrandColors.light.primary,
    icon: BrandColors.light.mutedForeground,
    tabIconDefault: BrandColors.light.mutedForeground,
    tabIconSelected: BrandColors.light.primary,
  },
  dark: {
    text: BrandColors.dark.foreground,
    background: BrandColors.dark.background,
    tint: BrandColors.dark.primary,
    icon: BrandColors.dark.mutedForeground,
    tabIconDefault: BrandColors.dark.mutedForeground,
    tabIconSelected: BrandColors.dark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
