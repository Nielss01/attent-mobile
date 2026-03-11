import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { useBrandColors } from "@/hooks/use-brand-colors";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline";
  style?: ViewStyle;
  icon?: React.ReactNode;
};

export function AuthButton({
  title,
  onPress,
  loading,
  variant = "primary",
  style,
  icon,
}: Props) {
  const c = useBrandColors();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: pressed ? c.primaryHover : c.primary }
          : {
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: c.input,
            },
        pressed && { opacity: 0.85 },
        loading && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? c.primaryForeground : c.primary}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              isPrimary
                ? { color: c.primaryForeground, fontWeight: "600" }
                : { color: c.foreground, fontWeight: "500" },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40, // h-10
    borderRadius: 12, // rounded-xl
    paddingHorizontal: 16, // px-4
    gap: 8, // gap-2
  },
  text: {
    fontSize: 14, // text-sm
  },
});
