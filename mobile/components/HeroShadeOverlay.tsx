import { StyleSheet, View } from "react-native";

const STRIPS = 36;

/**
 * One continuous shade over the full hero — sits above the photo, below logo/text.
 * Built from soft horizontal strips so it works via OTA (no native gradient module).
 */
export function HeroShadeOverlay({ height }: { height: number }) {
  const stripH = height / STRIPS;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: STRIPS }, (_, i) => {
        const t = i / (STRIPS - 1);
        const alpha = shadeOpacity(t);
        return (
          <View
            key={i}
            style={{
              height: stripH,
              backgroundColor: `rgba(0,0,0,${alpha.toFixed(3)})`,
            }}
          />
        );
      })}
    </View>
  );
}

/** Top & bottom darker for legibility; mid slightly lighter so the tire still reads. */
function shadeOpacity(t: number): number {
  if (t < 0.22) return 0.58 + (0.22 - t) * 0.55;
  if (t < 0.5) return 0.58 - (t - 0.22) * 0.45;
  if (t < 0.78) return 0.45 + (t - 0.5) * 0.35;
  return 0.55 + ((t - 0.78) / 0.22) * 0.45;
}
