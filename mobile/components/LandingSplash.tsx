import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_BG, AUTH_GRAY_60, AUTH_WHITE_90, authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { radius } from "../constants/theme";
import { AuthBackdrop } from "./AuthBackdrop";
import { AuthLogoHeader } from "./AuthLogoHeader";

export function LandingSplash() {
  const insets = useSafeAreaInsets();
  const barWidth = useRef(new Animated.Value(grid(3))).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(grid(35));

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

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
  }, [barWidth, contentOpacity]);

  const styles = useMemo(() => makeStyles(), []);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + grid(3) }]}>
      <StatusBar style="light" />
      <AuthBackdrop />
      <AuthLogoHeader />

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <Text style={styles.headline}>Your receipts.{"\n"}Submitted.</Text>
        <Text style={styles.subline}>Loading your workspace…</Text>

        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderFill, { width: barWidth }]} />
        </View>
      </Animated.View>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: AUTH_BG,
      paddingHorizontal: authHorizontalPad,
    },
    content: {
      gap: grid(1.5),
      paddingHorizontal: grid(0.5),
      marginTop: grid(2),
    },
    headline: {
      fontSize: 32,
      fontWeight: "800",
      color: AUTH_WHITE_90,
      lineHeight: 38,
      letterSpacing: -0.6,
    },
    subline: {
      fontSize: 15,
      lineHeight: 22,
      color: AUTH_GRAY_60,
    },
    loaderTrack: {
      height: grid(0.5),
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: radius.full,
      overflow: "hidden",
      marginTop: grid(2),
    },
    loaderFill: {
      height: "100%",
      backgroundColor: "#99C221",
      borderRadius: radius.full,
    },
  });
}
