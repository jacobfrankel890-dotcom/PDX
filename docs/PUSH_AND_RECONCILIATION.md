# Push notifications & missing expense reminders

Phase 1 backend for on-device notifications and future credit-card reconciliation.

## Setup

1. Run SQL (in order):
   - `supabase/push-tokens-migration.sql`
   - `supabase/expense-reminders-migration.sql`

2. Deploy edge function:
   ```bash
   cd supabase
   supabase functions deploy send-push --no-verify-jwt
   ```
   (`send-push` validates JWT inside the function.)

3. Optional admin emails (comma-separated) in Supabase Edge Function secrets:
   - `ADMIN_EMAILS=you@company.com,finance@company.com`
   - Users with `regional_manager` role are always admins.

4. Native push credentials:
   - **Android:** `google-services.json` + FCM in EAS
   - **iOS:** APNs key in EAS (`eas credentials -p ios`)

## Edge function: `send-push`

### Test (any signed-in user)

```json
POST /functions/v1/send-push
{ "action": "test" }
```

Sends a test notification to the caller's registered devices.

### Missing expense (admin only)

```json
POST /functions/v1/send-push
{
  "action": "missing_expense",
  "userId": "<employee-uuid>",
  "merchant": "Shell",
  "amount": 47.82,
  "expenseDate": "2026-06-01",
  "note": "This charge is on the May statement but not submitted."
}
```

Creates an `expense_reminders` row (unless `reminderId` is passed), sends Expo push, sets status to `notified`.

When the employee taps the notification, the app opens **Submit expense** with merchant, amount, and date pre-filled. Saving marks the reminder `submitted`.

## Mobile

- **Profile → Push notifications** — register device token
- **Profile → Push testing → Send test notification**
- **Regional managers** — **Send sample missing expense** (admin preview)

## Data model

`expense_reminders` — tracks flagged charges before/after push:

| Column | Purpose |
|--------|---------|
| `user_id` | Employee who should submit |
| `created_by` | Admin who flagged/sent |
| `merchant`, `amount`, `expense_date` | CC line details |
| `status` | `pending` → `notified` → `submitted` / `dismissed` |

## Next (Phase 2–3)

- Web admin: upload CC statements, AI reconciliation UI
- Admin selects unmatched rows → calls `missing_expense` with real data
- Optional: link reminder to `credit_card_transactions` table when import exists
