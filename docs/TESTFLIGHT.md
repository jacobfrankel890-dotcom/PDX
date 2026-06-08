# TestFlight Deployment Guide

This app is a **Next.js web app** + **Expo iOS shell**. The mobile app loads your deployed website in a native WebView — no local dev server needed.

```
┌─────────────────┐      HTTPS       ┌──────────────────┐
│  TestFlight     │  ──────────────► │  Vercel (web app) │
│  iOS app shell  │                  │  + Supabase API   │
└─────────────────┘                  └──────────────────┘
```

---

## Prerequisites

- [Apple Developer Program](https://developer.apple.com/programs/) ($99/year) — required for TestFlight
- [Expo account](https://expo.dev/signup) (free) — cloud iOS builds via EAS
- [Vercel account](https://vercel.com) (free) — hosts the web app
- Supabase project already set up (you've run `schema.sql`)

---

## Step 1: Deploy the web app to Vercel

You do **not** need `npm run dev` locally. All secrets go in Vercel, not on your Mac.

### 1a. Connect GitHub to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import repo: **jacobfrankel890-dotcom/PDX**
3. Framework: **Next.js** (auto-detected)
4. Root directory: **`/`** (project root, not `/mobile`)

### 1b. Add environment variables in Vercel

In Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fubgrrthbqdgxvggccwk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API |
| `OPENAI_API_KEY` | Your OpenAI key |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `TWILIO_ACCOUNT_SID` | (optional for now) |
| `TWILIO_AUTH_TOKEN` | (optional for now) |
| `TWILIO_VERIFY_SERVICE_SID` | (optional for now) |

Deploy. Copy your URL, e.g. `https://pdx-xyz.vercel.app`.

### 1c. Configure Supabase Auth for Vercel

In Supabase → Authentication → URL Configuration:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/**`

---

## Step 2: Configure the iOS app

Edit `mobile/eas.json` — replace `REPLACE-WITH-YOUR-VERCEL-URL` with your actual Vercel hostname in all three build profiles.

Example:
```json
"EXPO_PUBLIC_APP_URL": "https://pdx-xyz.vercel.app"
```

---

## Step 3: Build for TestFlight (cloud — no Xcode needed)

Run these from your Mac terminal (only the CLI runs locally; the iOS build happens on Expo's servers):

```bash
cd ~/Desktop/PDEXPENSE/mobile

# Install EAS CLI once
npm install -g eas-cli

# Log in to Expo
eas login

# Link project (creates Expo project, updates app.json projectId)
eas init

# Configure Apple credentials (follow prompts — needs Apple Developer login)
eas credentials

# Build for TestFlight (~15–20 min, builds in cloud)
eas build --platform ios --profile preview
```

When the build finishes, Expo gives you a link to download the `.ipa` or submit directly.

---

## Step 4: Submit to TestFlight

### 4a. Create app in App Store Connect (one time)

1. [App Store Connect](https://appstoreconnect.apple.com) → Apps → **+** New App
2. Name: **PDX Expense**
3. Bundle ID: **com.partsdistributionxpress.expense** (must match `mobile/app.json`)
4. Copy the **Apple ID** (numeric App Store Connect app ID)

### 4b. Update eas.json submit section

```json
"submit": {
  "preview": {
    "ios": {
      "appleTeamId": "YOUR_10_CHAR_TEAM_ID",
      "ascAppId": "1234567890"
    }
  }
}
```

Find Team ID: [Apple Developer → Membership](https://developer.apple.com/account)

### 4c. Submit the build

```bash
eas submit --platform ios --profile preview --latest
```

Or submit from the Expo dashboard after the build completes.

TestFlight processing usually takes **5–30 minutes** before testers can install.

---

## Step 5: Add TestFlight testers

App Store Connect → your app → **TestFlight** → Internal Testing → add testers by email.

---

## Updating the app later

| Change | What to do |
|--------|------------|
| Web app code (UI, API) | Push to GitHub → Vercel auto-deploys. **No new TestFlight build needed.** |
| Mobile shell (permissions, bundle ID) | `eas build --platform ios --profile preview` again |
| Environment variables | Update in Vercel dashboard → redeploy |

---

## Troubleshooting

**`cp .env.example` failed in home directory**  
Run commands from the project folder:
```bash
cd ~/Desktop/PDEXPENSE
```
For Vercel deployment you don't need `.env.local` on your Mac at all.

**Login/session not persisting in app**  
Ensure Supabase Site URL matches your Vercel URL exactly.

**Receipt camera not working in TestFlight**  
Camera permissions are in `app.json` — rebuild iOS if you change them.

**Build fails on credentials**  
Run `eas credentials --platform ios` and let EAS manage certificates.

---

## Quick reference

```bash
# Web: deploy via Git push (Vercel handles build)
git push origin main

# iOS: cloud build for TestFlight
cd mobile && eas build --platform ios --profile preview

# Submit to TestFlight
cd mobile && eas submit --platform ios --profile preview --latest
```
