export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string, confirmPassword?: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /[0-9]/.test(password),
  },
];

export const PASSWORD_MATCH_RULE: PasswordRule = {
  id: "match",
  label: "Passwords match",
  test: (password, confirmPassword) =>
    password.length > 0 && confirmPassword !== undefined && password === confirmPassword,
};

export function getPasswordRuleResults(password: string, confirmPassword?: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password, confirmPassword),
  }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function getPasswordValidationError(password: string, confirmPassword: string): string | null {
  if (!isPasswordValid(password)) {
    return "Password must meet all requirements below";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}
