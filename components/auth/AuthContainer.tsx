import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrandColors } from "@/hooks/use-brand-colors";
import { AttentLogo } from "@/components/auth/AttentLogo";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthContainer({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  const c = useBrandColors();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo — matches AttentLogo placement (mb-8 = 32px) */}
        <View style={styles.logoWrap}>
          <AttentLogo height={36} />
        </View>

        {/* Card — matches AuthCard: rounded-2xl p-6 shadow-card border-border/50 */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.card,
              borderColor: c.border + "80",
              shadowColor: c.foreground,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: c.cardForeground }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.cardSubtitle, { color: c.mutedForeground }]}>
                {subtitle}
              </Text>
            )}
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20, // px-5
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 32, // mb-8
  },
  card: {
    width: "100%",
    maxWidth: 384, // max-w-sm
    alignSelf: "center",
    borderRadius: 16, // rounded-2xl
    padding: 24, // p-6
    borderWidth: 1,
    // shadow-card: 0 4px 20px -4px
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 24, // mb-6
  },
  cardTitle: {
    fontSize: 20, // text-xl
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 14, // text-sm
    marginTop: 4, // mt-1
  },
});
