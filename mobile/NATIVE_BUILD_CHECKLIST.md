# Native Build Checklist (iOS + Android)

This app now includes native push notification registration and app-link configuration.

## 1) Supabase migration

Run:

- `supabase/push-tokens-migration.sql`

This creates `public.user_push_tokens` used by the app when push is enabled.

## 2) EAS env/config

Set this optional environment variable in EAS for universal/app links:

- `EXPO_PUBLIC_APP_LINK_DOMAIN=your-domain.com`

If set, the build adds:

- iOS: `associatedDomains` (`applinks:your-domain.com`)
- Android: `intentFilters` with `autoVerify` for `https://your-domain.com/*`

## 3) Push credentials

### iOS (APNs)

- Configure APNs key/cert in Apple Developer + App Store Connect
- Run `eas credentials -p ios` and attach push credentials

### Android (FCM)

- Create Firebase project / Android app
- Upload FCM service account JSON via `eas credentials -p android`

## 4) Notification payload deep links

Push payload data can include one of:

- `url` (full URL or app scheme URL)
- `route` (internal app route path)
- `path` (internal app route path)

Example:

```json
{
  "to": "ExponentPushToken[...]",
  "title": "Report approved",
  "body": "Tap to view the report",
  "data": {
    "route": "/(app)/reports/123"
  }
}
```

## 5) Build and submit

- `npm run build:all`
- Validate push and deep links on real devices
- `npm run submit:ios` and Android Play upload
