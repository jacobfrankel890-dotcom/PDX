import type { ExpoConfig } from "expo/config";

const { expo } = require("./app.json");

const appLinkDomainRaw = process.env.EXPO_PUBLIC_APP_LINK_DOMAIN;
const appLinkDomain = typeof appLinkDomainRaw === "string" ? appLinkDomainRaw.trim() : "";

const config: ExpoConfig = {
  ...expo,
  extra: {
    ...expo.extra,
    appLinkDomain: appLinkDomain || "",
  },
};

if (appLinkDomain) {
  const existingDomains: string[] = Array.isArray(expo.ios?.associatedDomains)
    ? expo.ios.associatedDomains
    : [];
  const associatedDomains = Array.from(new Set([...existingDomains, `applinks:${appLinkDomain}`]));

  config.ios = {
    ...expo.ios,
    associatedDomains,
  };

  const existingIntentFilters: Record<string, unknown>[] = Array.isArray(expo.android?.intentFilters)
    ? expo.android.intentFilters
    : [];

  config.android = {
    ...expo.android,
    intentFilters: [
      ...existingIntentFilters,
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: appLinkDomain,
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  };
}

export default config;
