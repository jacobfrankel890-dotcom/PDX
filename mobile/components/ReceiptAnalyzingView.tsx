import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import { radius, spacing } from "../constants/theme";

const STEPS = [
  { icon: "🔍", label: "Detecting merchant" },
  { icon: "💵", label: "Reading amounts" },
  { icon: "🏷️", label: "Categorizing expense" },
  { icon: "✨", label: "Almost done" },
];

type Props = {
  imageUri: string;
};

export function ReceiptAnalyzingView({ imageUri }: Props) {
  const { colors } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const scanOpacity = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fadeSteps = useRef(STEPS.map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.02, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(scanOpacity, { toValue: 0.45, duration: 400, useNativeDriver: true }),
      ])
    );

    pulseLoop.start();
    scanLoop.start();
    glowLoop.start();
    blinkLoop.start();

    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 2400);

    return () => {
      pulseLoop.stop();
      scanLoop.stop();
      glowLoop.stop();
      blinkLoop.stop();
      clearInterval(interval);
    };
  }, [pulse, scanY, scanOpacity, glow]);

  useEffect(() => {
    fadeSteps.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === stepIndex ? 1 : 0.35,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, [stepIndex, fadeSteps]);

  const scanTranslate = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.glowWrap}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              borderColor: colors.primary,
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View style={[styles.imageFrame, { transform: [{ scale: pulse }] }]}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
          <Image source={{ uri: imageUri }} style={styles.image} />
          <Animated.View
            style={[
              styles.scanLine,
              {
                opacity: scanOpacity,
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                transform: [{ translateY: scanTranslate }],
              },
            ]}
          />
          <View style={styles.scanGradientTop} pointerEvents="none" />
          <View style={styles.scanGradientBottom} pointerEvents="none" />
        </Animated.View>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <Animated.View
            key={step.label}
            style={[
              styles.stepRow,
              {
                opacity: fadeSteps[i],
                transform: [
                  {
                    translateX: fadeSteps[i].interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [0, 4],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.stepIcon, { backgroundColor: i === stepIndex ? colors.primary : colors.border }]}>
              <Text style={styles.stepEmoji}>{step.icon}</Text>
            </View>
            <Text style={[styles.stepLabel, { color: i === stepIndex ? colors.text : colors.textSecondary }]}>
              {step.label}
              {i === stepIndex ? "…" : ""}
            </Text>
            {i === stepIndex ? (
              <View style={styles.dots}>
                {[0, 1, 2].map((d) => (
                  <PulsingDot key={d} delay={d * 200} color={colors.primary} />
                ))}
              </View>
            ) : (
              <View style={styles.dots} />
            )}
          </Animated.View>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        This usually takes a few seconds
      </Text>
    </View>
  );
}

function PulsingDot({ delay, color }: { delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color, opacity: anim, transform: [{ scale: anim }] }]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  glowWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  glowRing: {
    position: "absolute",
    width: 260,
    height: 340,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  imageFrame: {
    width: 220,
    height: 300,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  corner: {
    position: "absolute",
    width: 22,
    height: 22,
    zIndex: 2,
  },
  cornerTL: { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  scanGradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  scanGradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  steps: {
    width: "100%",
    gap: 10,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepEmoji: { fontSize: 16 },
  stepLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
  dots: { flexDirection: "row", gap: 4, width: 28 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: { fontSize: 13, textAlign: "center", marginTop: "auto", paddingBottom: spacing.xl },
});
