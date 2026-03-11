import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useBrandColors } from "@/hooks/use-brand-colors";
import type { OTAState } from "@/hooks/use-ota-updates";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function UpdatePrompt({
  phase,
  progress,
  error,
  startDownload,
  applyUpdate,
  dismiss,
}: OTAState) {
  const c = useBrandColors();

  if (phase === "idle") return null;

  const title =
    phase === "available"
      ? "Update Available"
      : phase === "downloading"
        ? "Downloading Update\u2026"
        : phase === "ready"
          ? "Update Ready"
          : "Update Failed";

  const subtitle =
    phase === "available"
      ? "A new version of Attent is ready to install."
      : phase === "downloading"
        ? `${Math.round(progress * 100)}% complete`
        : phase === "ready"
          ? "Restart the app to apply the update."
          : error ?? "Something went wrong. Please try again.";

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.45)" }]}
      pointerEvents="box-none"
    >
      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(180)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.card, { backgroundColor: c.card }]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          {subtitle}
        </Text>

        {phase === "downloading" && (
          <ProgressBar progress={progress} color={c.primary} trackColor={c.muted} />
        )}

        <View style={styles.actions}>
          {phase === "available" && (
            <>
              <AnimatedPressable
                onPress={dismiss}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  { backgroundColor: pressed ? c.muted : "transparent" },
                ]}
              >
                <Text style={[styles.buttonSecondaryText, { color: c.mutedForeground }]}>
                  Later
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={startDownload}
                style={({ pressed }) => [
                  styles.buttonPrimary,
                  { backgroundColor: pressed ? c.primaryHover : c.primary },
                ]}
              >
                <Text style={[styles.buttonPrimaryText, { color: c.primaryForeground }]}>
                  Update Now
                </Text>
              </AnimatedPressable>
            </>
          )}

          {phase === "ready" && (
            <AnimatedPressable
              onPress={applyUpdate}
              style={({ pressed }) => [
                styles.buttonPrimary,
                styles.buttonFull,
                { backgroundColor: pressed ? c.primaryHover : c.primary },
              ]}
            >
              <Text style={[styles.buttonPrimaryText, { color: c.primaryForeground }]}>
                Restart Now
              </Text>
            </AnimatedPressable>
          )}

          {phase === "error" && (
            <>
              <AnimatedPressable
                onPress={dismiss}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  { backgroundColor: pressed ? c.muted : "transparent" },
                ]}
              >
                <Text style={[styles.buttonSecondaryText, { color: c.mutedForeground }]}>
                  Dismiss
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={startDownload}
                style={({ pressed }) => [
                  styles.buttonPrimary,
                  { backgroundColor: pressed ? c.primaryHover : c.primary },
                ]}
              >
                <Text style={[styles.buttonPrimaryText, { color: c.primaryForeground }]}>
                  Retry
                </Text>
              </AnimatedPressable>
            </>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function ProgressBar({
  progress,
  color,
  trackColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
}) {
  const animatedProgress = useDerivedValue(() =>
    withTiming(Math.max(0, Math.min(1, progress)), { duration: 300 }),
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as `${number}%`,
  }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: color }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  buttonPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonFull: {
    flex: 1,
  },
  buttonPrimaryText: {
    fontWeight: "600",
    fontSize: 15,
  },
  buttonSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonSecondaryText: {
    fontWeight: "600",
    fontSize: 15,
  },
});
