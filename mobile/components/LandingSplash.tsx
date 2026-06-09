import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { AUTH_GRAY_60, AUTH_WHITE_90, authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { radius } from "../constants/theme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { AuthLogoHeader } from "./AuthLogoHeader";

export function LandingSplash() {
  const barWidth = useRef(new Animated.Value(grid(3))).current;
  const trackWidth = useRef(grid(35));

  useEffect(() => {
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
  }, [barWidth]);

  const styles = useMemo(() => makeStyles(), []);

  return (
    <AuthScreenLayout>
      <AuthLogoHeader />

      <View style={styles.content}>
        <Text style={styles.headline}>Your receipts.{"\n"}Submitted.</Text>
        <Text style={styles.subline}>Loading your workspace…</Text>

        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderFill, { width: barWidth }]} />
        </View>
      </View>
    </AuthScreenLayout>
  );
}

function makeStyles() {
  return StyleSheet.create({
    content: {
      flex: 1,
      gap: grid(1.5),
      width: "100%",
      maxWidth: 430,
      alignSelf: "center",
      paddingHorizontal: authHorizontalPad,
      paddingTop: grid(1),
      paddingBottom: grid(3),
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
