# PDX Expense Report App

Expense reporting portal for **Parts Distribution Xpress** regional managers and Key Account Managers (KAMs). Submit weekly/monthly expense reports that export to the same Excel format as the company T&E spreadsheet.

## Features

- **Multi-step signup** with first name, last name, email, phone (Twilio OTP), role (Regional Manager / KAM), and region selection
- **Seven PDX regions**: CPX, PDX North, APX, PDX, PDX South, PDX West, APX California
- **Spreadsheet-matched expense entry** — same columns as the T&E template (Date, Description, Related To, TRV/LOD, Tolls/Parking, Miles, Mileage Calc, Office Supplies, Meals & Ent., Vehicle Maint., Marketing, Misc., Total)
- **Auto-calculated** mileage ($0.67/mi default) and row/column totals
- **Draft → Submit workflow** with status tracking
- **One-click Excel export** matching the original spreadsheet layout
- **AI Receipt Scanner** — upload receipt photos; OpenAI reads, categorizes, itemizes, and fills expense rows
- **Supabase backend** with RLS, triggers for total recalculation, and export views

## Quick Start

> **Native iOS app (TestFlight, no Vercel):** See **[docs/NATIVE_APP.md](docs/NATIVE_APP.md)** — Expo + Supabase, same pattern as Motorly/Reroute.

> **Legacy web + WebView approach:** See [docs/TESTFLIGHT.md](docs/TESTFLIGHT.md) (not recommended).

### Local development (optional)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Open your [Supabase project](https://supabase.com/dashboard/project/fubgrrthbqdgxvggccwk) (PDX)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Run `supabase/receipts-migration.sql` for receipt storage + AI upload tracking
4. Copy your **Project URL**, **anon key**, and **service role key** from Settings → API

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase and Twilio credentials.

**OpenAI (receipt AI):**
- Add `OPENAI_API_KEY` from [platform.openai.com](https://platform.openai.com/api-keys)
- Optional: `OPENAI_MODEL` (default `gpt-4o-mini`; use `gpt-4o` for higher accuracy)

**Dev mode without Twilio:** If Twilio env vars are not set, the app runs in dev mode — use OTP code `123456`.

### 4. Set up Twilio Verify (production)

1. Create a [Twilio account](https://www.twilio.com)
2. Create a **Verify Service** in Console → Verify → Services
3. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` to `.env.local`

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User info: name, email, phone, role, region |
| `expense_reports` | Pay period header + denormalized column totals |
| `expense_line_items` | Individual expense rows (matches spreadsheet) |
| `app_settings` | Mileage rate, company name |
| `phone_verifications` | OTP verification audit log |
| `v_expense_export` | Flattened view for spreadsheet export |

See `supabase/schema.sql` for the full schema with RLS policies and triggers.

## Export Queries

Pre-built SQL for finance/admin use is in `supabase/export-queries.sql`:

- Weekly line-item export
- Monthly summary by employee
- Region totals rollup
- Pending approval queue
- Category breakdown by region

Individual reports can also be exported as `.xlsx` from the app via **Export Excel**.

## Project Structure

```
src/
├── app/
│   ├── api/auth/send-otp/    # Twilio OTP send
│   ├── api/auth/verify-otp/  # Twilio OTP verify
│   ├── api/export/           # Excel download
│   ├── dashboard/            # Report list & stats
│   ├── login/
│   ├── signup/
│   └── reports/[id]/         # Expense report editor
├── components/
│   ├── auth/                 # Signup & login forms
│   ├── dashboard/
│   ├── layout/               # App shell / nav
│   ├── reports/              # Spreadsheet editor
│   └── ui/                   # Button, Input, Card, etc.
└── lib/
    ├── supabase/             # Client, server, admin
    ├── twilio.ts
    ├── types.ts              # Regions, roles, expense columns
    └── utils.ts
```

## Regions Reference

| Region | Territory |
|--------|-----------|
| CPX | Canada |
| PDX North | Northeast US |
| APX | Auto Parts Xpress |
| PDX | Core PDX territory |
| PDX South | Southeast US |
| PDX West | Northwest US |
| APX California | Southwest US / California |

## License

Private — Parts Distribution Xpress / Drive Motorly
