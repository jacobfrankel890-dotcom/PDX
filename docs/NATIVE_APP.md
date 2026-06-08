# PDX Expense — Native iOS App (Expo)

This is a **real React Native / Expo app** — same pattern as Motorly and Reroute. No Vercel, no WebView.

```
iPhone app  →  Supabase (database + auth + edge functions)
                      ↓
               Twilio OTP / OpenAI (secrets stay on server)
```

---

## What's in the mobile app

- Sign up with phone OTP, role & region selection
- Login
- Dashboard with expense reports
- Expense report editor (line items, mileage, categories)
- **AI receipt scanner** (camera or photo library → OpenAI categorizes)

---

## One-time setup

### 1. Supabase Edge Functions (server-side APIs)

Install [Supabase CLI](https://supabase.com/docs/guides/cli), then from project root:

```bash
supabase login
supabase link --project-ref fubgrrthbqdgxvggccwk

# Set secrets (Dashboard → Edge Functions → Secrets works too)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_VERIFY_SERVICE_SID=...

# Deploy functions
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy analyze-receipt
```

Without Twilio secrets, OTP dev mode accepts code **123456**.

### 2. Configure mobile env for EAS builds

Edit `mobile/eas.json` — replace `YOUR_SUPABASE_ANON_KEY` with your anon key from Supabase → Settings → API.

Or set in Expo dashboard → Project → Environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 3. Build for TestFlight

```bash
cd mobile
npm install
npm install -g eas-cli
eas login
eas init
eas build --platform ios --profile preview
eas submit --platform ios --profile preview --latest
```

That's it. Same flow as your other apps.

---

## Optional: local dev with Expo Go

```bash
cd mobile
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_* keys
npm install
npx expo start
```

Scan QR with Expo Go on your phone.

---

## Architecture note

The `src/` Next.js web app in the repo root is still there (useful for admin/finance web export later) but **the iOS app does not depend on it**. The mobile app talks directly to Supabase like Motorly/Reroute.
