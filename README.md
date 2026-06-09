# PDX Expense (Mobile-Only)

Native Expo app for Parts Distribution Xpress expense reporting.

## Repo Structure

- `mobile/` - React Native / Expo iOS + Android app
- `supabase/` - schema, migrations, and SQL helpers
- `docs/NATIVE_APP.md` - native build + TestFlight workflow

## Run From Project Root

You can now run the mobile app commands directly from root:

```bash
npm run start
npm run ios
npm run build:ios
npm run build:android
npm run build:all
npm run update:preview -- "message"
npm run submit:ios
```

These scripts delegate to `mobile/` automatically.

## Environment

For local Expo dev, copy:

```bash
cp .env.example mobile/.env
```

Then fill:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_LINK_DOMAIN` (optional)

## Supabase Setup

Run SQL in this order:

1. `supabase/schema.sql`
2. `supabase/receipts-migration.sql`
3. `supabase/push-tokens-migration.sql`
4. `supabase/expense-reminders-migration.sql`

Deploy push sender:

```bash
supabase functions deploy send-push
```

See `docs/PUSH_AND_RECONCILIATION.md` for admin push + reconciliation roadmap.

## Notes

- Twilio and OpenAI secrets should be stored in Supabase Edge Function secrets.
- OTA updates are pushed with EAS Update and do not require a native rebuild unless native code/capabilities change.
