import { View } from "react-native";
import { spacing } from "../constants/theme";

export function ListGap({ height = spacing.sm }: { height?: number }) {
  return <View style={{ height }} />;
}
