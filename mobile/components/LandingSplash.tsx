import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/settings-context";
import { grid } from "../lib/grid";
import { radius, spacing, type ThemeColors } from "../constants/theme";
import { PdxLogo } from "./PdxLogo";
import { LogisticsHero } from "./LogisticsHero";

export function LandingSplash() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const barWidth = useRef(new Animated.Value(grid(3))).current;
  const contentY = useRef(new Animated.Value(grid(2))).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(grid(35));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentY, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(barWidth, {
          toValue: trackWidth.current * 0.88,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(barWidth, {
          toValue: grid(3),
          duration: 400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [barWidth, contentOpacity, contentY]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + grid(3), paddingBottom: insets.bottom + grid(3) }]}>
      <Animated.View
        style={[
          styles.grid,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
          },
        ]}
      >
        <View style={styles.logoRow}>
          <PdxLogo size="xl" tagline="Expense" style={styles.logo} />
        </View>

        <View style={styles.heroSlot}>
          <LogisticsHero />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.headline}>Parts distribution, simplified.</Text>
          <Text style={styles.subline}>
            Scan receipts, track mileage, and submit expenses — built for PDX teams on the road.
          </Text>
        </View>

        <View style={styles.loaderBlock}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, { width: barWidth }]} />
          </View>
          <Text style={styles.loaderLabel}>Loading your workspace…</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: grid(3),
    },
    grid: {
      flex: 1,
      justifyContent: "space-between",
      maxWidth: 400,
      width: "100%",
      alignSelf: "center",
    },
    logoRow: {
      alignItems: "center",
      paddingVertical: grid(1),
    },
    logo: { alignItems: "center" },
    heroSlot: {
      alignItems: "center",
      paddingVertical: grid(2),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: grid(2),
      paddingTop: grid(3),
      paddingBottom: grid(2),
    },
    copyBlock: {
      gap: grid(1),
      paddingHorizontal: grid(1),
    },
    headline: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      letterSpacing: -0.3,
    },
    subline: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: "center",
    },
    loaderBlock: {
      gap: grid(1),
      paddingHorizontal: grid(2),
    },
    loaderTrack: {
      height: grid(0.5),
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: "hidden",
    },
    loaderFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: radius.full,
    },
    loaderLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center",
      letterSpacing: 0.2,
    },
  });
}
