import { StyleSheet, Text, View } from "react-native";
import {
  getPasswordRuleResults,
  PASSWORD_MATCH_RULE,
  type PasswordRule,
} from "../lib/password-requirements";

type Props = {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
  tone?: "auth" | "default";
};

function RuleRow({
  rule,
  met,
  tone,
}: {
  rule: PasswordRule;
  met: boolean;
  tone: "auth" | "default";
}) {
  const isAuth = tone === "auth";
  return (
    <View style={styles.row}>
      <Text style={[styles.icon, met ? styles.iconMet : isAuth ? styles.iconPendingAuth : styles.iconPending]}>
        {met ? "✓" : "○"}
      </Text>
      <Text style={[styles.label, met ? styles.labelMet : isAuth ? styles.labelPendingAuth : styles.labelPending]}>
        {rule.label}
      </Text>
    </View>
  );
}

export function PasswordRequirements({ password, confirmPassword, showMatch = false, tone = "auth" }: Props) {
  const rules = getPasswordRuleResults(password, confirmPassword);

  return (
    <View style={styles.wrap}>
      {rules.map((rule) => (
        <RuleRow key={rule.id} rule={rule} met={rule.met} tone={tone} />
      ))}
      {showMatch ? (
        <RuleRow
          rule={PASSWORD_MATCH_RULE}
          met={PASSWORD_MATCH_RULE.test(password, confirmPassword)}
          tone={tone}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginTop: -4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 16,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  iconPending: {
    color: "#EF4444",
  },
  iconPendingAuth: {
    color: "#F87171",
  },
  iconMet: {
    color: "#99C221",
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  labelPending: {
    color: "#EF4444",
  },
  labelPendingAuth: {
    color: "#F87171",
  },
  labelMet: {
    color: "#99C221",
    fontWeight: "600",
  },
});
