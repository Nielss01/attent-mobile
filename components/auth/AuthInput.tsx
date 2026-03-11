import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "react-native";
import { useBrandColors } from "@/hooks/use-brand-colors";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthInput({ label, error, style, ...rest }: Props) {
  const c = useBrandColors();

  return (
    <View style={styles.wrapper}>
      {/* Label — text-xs text-muted-foreground, space-y-1.5 */}
      <Text style={[styles.label, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: c.foreground,
            borderColor: error ? c.destructive : c.input,
            backgroundColor: c.background,
          },
          style,
        ]}
        placeholderTextColor={c.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {error && <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6, // space-y-1.5
    marginBottom: 16, // space-y-4
  },
  label: {
    fontSize: 12, // text-xs
    fontWeight: "500", // font-medium
  },
  input: {
    height: 40, // h-10
    borderWidth: 1,
    borderRadius: 14, // rounded-md = calc(1rem - 2px)
    paddingHorizontal: 12, // px-3
    fontSize: 16, // text-base
  },
  error: {
    fontSize: 13,
    marginTop: 2,
  },
});
