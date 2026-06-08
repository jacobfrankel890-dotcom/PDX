import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import { grid } from "../lib/grid";
import { radius, spacing, type ThemeColors } from "../constants/theme";

const FEATURES = [
  { icon: "📷", label: "Scan" },
  { icon: "🛞", label: "Track" },
  { icon: "📦", label: "Ship" },
  { icon: "✓", label: "Submit" },
] as const;

type Props = {
  compact?: boolean;
};

export function LogisticsHero({ compact }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, compact), [colors, compact]);

  const truckX = useRef(new Animated.Value(0)).current;
  const tireSpin = useRef(new Animated.Value(0)).current;
  const roadDash = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const truckLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(truckX, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(truckX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(tireSpin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const dashLoop = Animated.loop(
      Animated.timing(roadDash, {
        toValue: 1,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    truckLoop.start();
    spinLoop.start();
    dashLoop.start();

    return () => {
      truckLoop.stop();
      spinLoop.stop();
      dashLoop.stop();
    };
  }, [fadeIn, roadDash, tireSpin, truckX]);

  const trackWidth = compact ? 220 : 280;
  const truckTranslate = truckX.interpolate({
    inputRange: [0, 1],
    outputRange: [-grid(2), trackWidth - grid(10)],
  });

  const tireRotate = tireSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const dashShift = roadDash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -grid(3)],
  });

  return (
    <Animated.View style={[styles.wrap, { opacity: fadeIn }]}>
      <View style={[styles.scene, { width: trackWidth }]}>
        <View style={styles.skyline}>
          <View style={[styles.building, styles.buildingL]} />
          <View style={[styles.building, styles.buildingM]} />
          <View style={[styles.building, styles.buildingS]} />
        </View>

        <Animated.View style={[styles.roadDashes, { transform: [{ translateX: dashShift }] }]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </Animated.View>
        <View style={styles.road} />

        <Animated.View style={[styles.truckWrap, { transform: [{ translateX: truckTranslate }] }]}>
          <Text style={styles.truckCab}>🚚</Text>
          <Animated.View style={[styles.tire, styles.tireBack, { transform: [{ rotate: tireRotate }] }]}>
            <Text style={styles.tireGlyph}>🛞</Text>
          </Animated.View>
          <Animated.View style={[styles.tire, styles.tireFront, { transform: [{ rotate: tireRotate }] }]}>
            <Text style={styles.tireGlyph}>🛞</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.packageStack}>
          <Text style={styles.packageIcon}>📦</Text>
        </View>
      </View>

      {!compact ? (
        <View style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureCell}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function makeStyles(colors: ThemeColors, compact?: boolean) {
  const sceneH = compact ? grid(14) : grid(18);
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      gap: compact ? grid(2) : grid(3),
      width: "100%",
    },
    scene: {
      height: sceneH,
      alignSelf: "center",
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    skyline: {
      position: "absolute",
      top: grid(1),
      left: grid(2),
      right: grid(2),
      flexDirection: "row",
      alignItems: "flex-end",
      gap: grid(1),
      opacity: 0.35,
    },
    building: { backgroundColor: colors.border, borderRadius: 2 },
    buildingL: { width: grid(5), height: grid(6) },
    buildingM: { width: grid(4), height: grid(4) },
    buildingS: { width: grid(3), height: grid(5) },
    road: {
      height: grid(1),
      backgroundColor: colors.textSecondary,
      borderRadius: 1,
      opacity: 0.25,
    },
    roadDashes: {
      position: "absolute",
      bottom: grid(1) + 2,
      left: 0,
      flexDirection: "row",
      gap: grid(2),
      width: grid(40),
    },
    dash: {
      width: grid(2),
      height: 2,
      backgroundColor: colors.primary,
      borderRadius: 1,
      opacity: 0.5,
    },
    truckWrap: {
      position: "absolute",
      bottom: grid(1) - 2,
      left: 0,
      width: grid(10),
      height: grid(5),
    },
    truckCab: { fontSize: compact ? 28 : 34, lineHeight: compact ? 32 : 38 },
    tire: {
      position: "absolute",
      bottom: 0,
    },
    tireBack: { left: grid(2) },
    tireFront: { left: grid(6) },
    tireGlyph: { fontSize: 14 },
    packageStack: {
      position: "absolute",
      right: 0,
      bottom: grid(1),
      width: grid(4),
      height: grid(4),
      backgroundColor: colors.greenLight,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    packageIcon: { fontSize: 18 },
    featureGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      width: grid(35),
      gap: grid(1),
      justifyContent: "center",
    },
    featureCell: {
      width: grid(16),
      height: grid(7),
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: grid(0.5),
    },
    featureIcon: { fontSize: 18 },
    featureLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
  });
}
