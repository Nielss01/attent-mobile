import { BrandColors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useBrandColors() {
  const scheme = useColorScheme() ?? "light";
  return BrandColors[scheme];
}
