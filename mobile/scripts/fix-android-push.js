#!/usr/bin/env node
/**
 * Upload Firebase FCM V1 service account to EAS and assign to PDX Expense Android app.
 * Run from mobile/:
 *   FCM_SERVICE_ACCOUNT_JSON="/path/to/service-account.json" node scripts/fix-android-push.js
 */
const fs = require("fs");
const path = require("path");

const EAS_CLI = process.env.EAS_CLI_ROOT || "/Users/jacobfrankel/.nvm/versions/node/v20.20.0/lib/node_modules/eas-cli";
const DEFAULT_KEY_PATH = path.join(
  process.env.HOME,
  "Desktop/Reroute Android AAB files/reroute-65ab9-de3ccdaf71fe.json"
);

const { createGraphqlClient } = require(path.join(
  EAS_CLI,
  "build/commandUtils/context/contextUtils/createGraphqlClient"
));
const AndroidGql = require(path.join(EAS_CLI, "build/credentials/android/api/GraphqlClient"));
const { AndroidAppCredentialsMutation } = require(path.join(
  EAS_CLI,
  "build/credentials/android/api/graphql/mutations/AndroidAppCredentialsMutation"
));
const { readAndValidateServiceAccountKey } = require(path.join(
  EAS_CLI,
  "build/credentials/android/utils/googleServiceAccountKey"
));
const { AppQuery } = require(path.join(EAS_CLI, "build/graphql/queries/AppQuery"));

const ACCOUNT = "pd-expense";
const PROJECT = "pdx-expense";
const PACKAGE = "com.partsdistributionxpress.expense";

function readExpoSession() {
  const statePath = path.join(process.env.HOME, ".expo/state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const sessionSecret = state?.auth?.sessionSecret;
  if (!sessionSecret) {
    throw new Error("Not logged in to Expo. Run: eas login");
  }
  return sessionSecret;
}

async function main() {
  const keyPath = process.env.FCM_SERVICE_ACCOUNT_JSON || DEFAULT_KEY_PATH;
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account JSON not found: ${keyPath}`);
  }

  const jsonKey = readAndValidateServiceAccountKey(keyPath);
  console.log(`Using service account: ${jsonKey.client_email}`);

  const sessionSecret = readExpoSession();
  const graphqlClient = createGraphqlClient({ sessionSecret, accessToken: null });
  const projectFullName = `@${ACCOUNT}/${PROJECT}`;

  const app = await AppQuery.byFullNameAsync(graphqlClient, projectFullName);
  if (!app) {
    throw new Error(`App not found: ${projectFullName}`);
  }

  const appLookupParams = {
    account: app.ownerAccount,
    projectName: app.name,
    androidApplicationIdentifier: PACKAGE,
  };

  const creds = await AndroidGql.getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
  if (creds?.googleServiceAccountKeyForFcmV1) {
    console.log(
      `FCM V1 key already assigned: ${creds.googleServiceAccountKeyForFcmV1.clientEmail}`
    );
    return;
  }

  const existingKeys = await AndroidGql.getGoogleServiceAccountKeysForAccountAsync(graphqlClient, app.ownerAccount);
  let gsaKey = existingKeys.find((key) => key.clientEmail === jsonKey.client_email);

  if (!gsaKey) {
    console.log("Uploading Google Service Account key to EAS…");
    gsaKey = await AndroidGql.createGoogleServiceAccountKeyAsync(graphqlClient, app.ownerAccount, jsonKey);
  } else {
    console.log(`Reusing existing EAS key: ${gsaKey.clientEmail}`);
  }

  console.log("Assigning FCM V1 credentials to PDX Expense…");
  const appCredentials = await AndroidGql.createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync(
    graphqlClient,
    appLookupParams
  );
  await AndroidAppCredentialsMutation.setGoogleServiceAccountKeyForFcmV1Async(
    graphqlClient,
    appCredentials.id,
    gsaKey.id
  );

  console.log("\nDone. Android FCM V1 credentials are configured.");
  console.log(`  Service account: ${gsaKey.clientEmail}`);
  console.log(`  Firebase project: reroute-65ab9`);
  console.log("\nTry Profile → Send test notification on Android.");
}

main().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
