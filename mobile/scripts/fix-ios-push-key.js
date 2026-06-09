#!/usr/bin/env node
/**
 * Regenerates a valid APNs push key via Apple Developer and assigns it to PDX Expense on EAS.
 * Run from mobile/: node scripts/fix-ios-push-key.js
 */
const fs = require("fs");
const path = require("path");

const EAS_CLI = process.env.EAS_CLI_ROOT || "/Users/jacobfrankel/.nvm/versions/node/v20.20.0/lib/node_modules/eas-cli";
const { createGraphqlClient } = require(path.join(
  EAS_CLI,
  "build/commandUtils/context/contextUtils/createGraphqlClient"
));
const { authenticateAsync } = require(path.join(EAS_CLI, "build/credentials/ios/appstore/authenticate"));
const { createPushKeyAsync: createApplePushKeyAsync } = require(path.join(
  EAS_CLI,
  "build/credentials/ios/appstore/pushKey"
));
const GraphqlClient = require(path.join(EAS_CLI, "build/credentials/ios/api/GraphqlClient"));
const { IosAppCredentialsMutation } = require(path.join(
  EAS_CLI,
  "build/credentials/ios/api/graphql/mutations/IosAppCredentialsMutation"
));
const { AppQuery } = require(path.join(EAS_CLI, "build/graphql/queries/AppQuery"));

const ACCOUNT = "pd-expense";
const PROJECT = "pdx-expense";
const BUNDLE_ID = "com.partsdistributionxpress.expense";
const TEAM_ID = "8G5Y85C7V2";

function readExpoSession() {
  const statePath = path.join(process.env.HOME, ".expo/state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const sessionSecret = state?.auth?.sessionSecret;
  if (!sessionSecret) {
    throw new Error("Not logged in to Expo. Run: eas login");
  }
  return sessionSecret;
}

function readAppleCookies() {
  const usernamePath = path.join(process.env.HOME, ".app-store/auth/username.json");
  const { username } = JSON.parse(fs.readFileSync(usernamePath, "utf8"));
  const cookiePath = path.join(process.env.HOME, ".app-store/auth", username, "cookie");
  return JSON.parse(fs.readFileSync(cookiePath, "utf8"));
}

async function main() {
  const sessionSecret = readExpoSession();
  const graphqlClient = createGraphqlClient({ sessionSecret, accessToken: null });
  const projectFullName = `@${ACCOUNT}/${PROJECT}`;

  console.log("Fetching Expo app…");
  const app = await AppQuery.byFullNameAsync(graphqlClient, projectFullName);
  if (!app) {
    throw new Error(`App not found: ${projectFullName}`);
  }

  const appLookupParams = {
    account: app.ownerAccount,
    projectName: app.name,
    bundleIdentifier: BUNDLE_ID,
  };

  const currentPushKey = await GraphqlClient.getPushKeyForAppAsync(graphqlClient, appLookupParams);
  if (currentPushKey) {
    console.log(`Current push key on EAS: ${currentPushKey.keyIdentifier} (${currentPushKey.id})`);
  }

  console.log("Authenticating with Apple Developer (cached session)…");
  const appleAuth = await authenticateAsync({
    teamId: TEAM_ID,
    cookies: readAppleCookies(),
  });

  console.log("Creating new APNs key on Apple Developer…");
  const pushKeyMaterial = await createApplePushKeyAsync(appleAuth);
  console.log(`Created Apple push key: ${pushKeyMaterial.apnsKeyId}`);

  console.log("Uploading push key to EAS…");
  const easPushKey = await GraphqlClient.createPushKeyAsync(graphqlClient, app.ownerAccount, pushKeyMaterial);
  console.log(`Stored on EAS: ${easPushKey.keyIdentifier} (${easPushKey.id})`);

  console.log("Assigning push key to PDX Expense…");
  const appCredentials = await GraphqlClient.createOrGetIosAppCredentialsWithCommonFieldsAsync(
    graphqlClient,
    appLookupParams,
    { appleTeam: easPushKey.appleTeam ?? undefined }
  );
  await IosAppCredentialsMutation.setPushKeyAsync(graphqlClient, appCredentials.id, easPushKey.id);

  if (currentPushKey && currentPushKey.id !== easPushKey.id) {
    console.log(`Removing old push key ${currentPushKey.keyIdentifier} from EAS…`);
    await GraphqlClient.deletePushKeyAsync(graphqlClient, currentPushKey.id);
  }

  console.log("\nDone. Push key is fixed.");
  console.log(`  Key ID: ${easPushKey.keyIdentifier}`);
  console.log(`  Team:   ${TEAM_ID}`);
  console.log("\nTry Profile → Send test notification in the app.");
}

main().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
