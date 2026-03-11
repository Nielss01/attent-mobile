import { StyleSheet, View, Text } from "react-native";
import { useBrandColors } from "@/hooks/use-brand-colors";

export function AuthDivider() {
  const c = useBrandColors();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: c.border }]} />
      <View style={[styles.textWrap, { backgroundColor: c.card }]}>
        <Text style={[styles.text, { color: c.mutedForeground }]}>or</Text>
      </View>
      <View style={[styles.line, { backgroundColor: c.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24, // my-6
    gap: 0,
  },
  line: {
    flex: 1,
    height: 1,
  },
  textWrap: {
    paddingHorizontal: 12, // px-3
  },
  text: {
    fontSize: 12, // text-xs
  },
});
