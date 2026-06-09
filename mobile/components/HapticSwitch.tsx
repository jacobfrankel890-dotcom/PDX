import { Switch, type SwitchProps } from "react-native";
import { hapticToggle } from "../lib/haptics";

type Props = SwitchProps;

export function HapticSwitch({ onValueChange, ...props }: Props) {
  return (
    <Switch
      {...props}
      onValueChange={(value) => {
        hapticToggle(value);
        onValueChange?.(value);
      }}
    />
  );
}
