# PDX Expense — Wix Website Integration

HTML embeds + Velo backend for the PDX Expense website on Wix. Connects to the same Supabase database as the mobile app.

## What's included

| File | Purpose |
|------|---------|
| `embeds/employee-portal.html` | Employee self-service: sign in, view expenses, add entries, submit reports |
| `embeds/admin-dashboard.html` | Finance admin: pending approvals, CSV export, employee list |
| `velo/backend/supabase-client.jsw` | Service-role Supabase REST client + admin JWT verification |
| `velo/backend/pdx-admin.jsw` | Admin API (list/approve/reject/export) |
| `velo/pages/employee-portal.js` | Wix page bridge — injects Supabase config into employee embed |
| `velo/pages/admin-dashboard.js` | Wix page bridge — routes admin embed requests to Velo backend |
| `velo/http-functions/pdx-admin.js` | Optional REST API at `/_functions/pdxAdmin` |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Wix Page (Employee)                                        │
│  ┌──────────────────────┐    postMessage(config)            │
│  │ employee-portal.html │◄────────────────────────────────│
│  │  Supabase JS (anon)  │──────► Supabase PostgREST        │
│  └──────────────────────┘         (RLS: own data only)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Wix Page (Admin — password/members protected)              │
│  ┌──────────────────────┐    postMessage(api calls)         │
│  │ admin-dashboard.html │◄────────────────────────────────►│
│  │  Supabase auth only  │         Velo page code            │
│  └──────────────────────┘              │                    │
│                                        ▼                    │
│                              pdx-admin.jsw (service role) │
│                                        │                    │
│                                        ▼                    │
│                              Supabase Postgres              │
└─────────────────────────────────────────────────────────────┘
```

**Employee embed** talks directly to Supabase with the anon key (same as mobile). Row Level Security ensures users only see their own data.

**Admin embed** signs in via Supabase auth, then sends the JWT to Velo. Velo verifies the email is in `ADMIN_EMAILS`, then uses the **service role key** for cross-user queries (approve, export, etc.).

---

## Wix Secrets (required)

Add these in **Wix Dashboard → Settings → Secrets Manager**:

| Secret name | Value | Required for |
|-------------|-------|--------------|
| `SUPABASE_URL` | `https://fubgrrthbqdgxvggccwk.supabase.co` | All pages |
| `SUPABASE_ANON_KEY` | Your Supabase **anon/public** key (Settings → API in Supabase dashboard) | Employee + Admin embeds |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase **service_role** key (keep private — never put in HTML) | Admin Velo backend only |
| `ADMIN_EMAILS` | Comma-separated admin emails, e.g. `jfrankel@routemessengers.com` | Admin access control |

### Where to find Supabase keys

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/fubgrrthbqdgxvggccwk/settings/api)
2. **Project URL** → `SUPABASE_URL`
3. **anon public** → `SUPABASE_ANON_KEY`
4. **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (Reveal → copy — this bypasses RLS)

### Secrets you do NOT need in Wix

These stay in **Supabase Edge Function secrets** (already configured for mobile):

- `OPENAI_API_KEY` — receipt AI (mobile only for now)
- `TWILIO_*` — phone OTP (disabled in mobile)
- Expo push credentials — mobile only

---

## Setup steps

### 1. Copy Velo files into Wix

In the Wix Editor, open **Code sidebar**:

1. **Backend** → create `supabase-client.jsw` — paste from `velo/backend/supabase-client.jsw`
2. **Backend** → create `pdx-admin.jsw` — paste from `velo/backend/pdx-admin.jsw`
3. **HTTP Functions** (optional) → create `pdx-admin.js` — paste from `velo/http-functions/pdx-admin.js`

### 2. Employee portal page

1. Create a new page, e.g. `/employee-expenses`
2. Add an **HTML iframe** element (or Custom Element)
3. Set element ID to `pdxEmployeeEmbed`
4. Click **Enter Code** → paste entire contents of `embeds/employee-portal.html`
5. Open **Page Code** → paste `velo/pages/employee-portal.js`
6. Publish

### 3. Admin dashboard page

1. Create a new page, e.g. `/expense-admin`
2. **Protect the page** — Wix password, members-only, or IP restriction
3. Add HTML iframe, ID = `pdxAdminEmbed`
4. Paste `embeds/admin-dashboard.html` into the HTML component
5. Paste `velo/pages/admin-dashboard.js` into Page Code
6. Add your email to `ADMIN_EMAILS` secret
7. Publish

### 4. Verify connection

After publishing:

1. **Employee page** — sign in with a mobile app account → you should see expenses
2. **Admin page** — sign in with an `ADMIN_EMAILS` account → pending reports load
3. Optional HTTP ping: `GET https://yoursite.com/_functions/pdxAdmin?action=ping` → `{ "ok": true, "mileage_rate": "0.67" }`

---

## Admin capabilities

| Action | Description |
|--------|-------------|
| List pending | Submitted reports awaiting approval |
| Approve / Reject | Updates `expense_reports.status` (same as manual SQL in `export-queries.sql`) |
| Export CSV | Flattened line items for a date range |
| Region summary | Totals grouped by region |
| Employee list | All profiles, filterable by region |

---

## Security notes

- **Never** embed `SUPABASE_SERVICE_ROLE_KEY` in HTML or frontend JavaScript
- **Always** protect the admin Wix page (password or members area)
- `ADMIN_EMAILS` is the authorization gate — only those Supabase accounts can call admin APIs
- Employee embed uses the same RLS policies as the mobile app — no cross-user access
- Rotate service role key in Supabase if ever exposed

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build error: `Cannot find module 'wix-secrets-backend'` | Page code cannot import secrets. Use `import { getPublicConfig } from "backend/supabase-client"` in pages — secrets stay in `.jsw` files only |
| "Connecting…" forever | Check Wix Secrets are set; republish site; verify HTML element ID matches page code |
| "You do not have admin access" | Add your email to `ADMIN_EMAILS` secret (lowercase, comma-separated) |
| "Request timed out" | Admin page code not published or wrong embed ID `#pdxAdminEmbed` |
| Sign in works on mobile but not web | Same Supabase project URL + anon key; check email/password |
| Approve fails | Report may already be approved; only `submitted` reports can be approved |
| CORS errors | Use Wix page bridge (postMessage), not direct fetch to Supabase with service role from browser |

---

## Optional: HTTP API

If you prefer fetch over postMessage, enable HTTP functions and call:

```bash
# Health check (no auth)
curl "https://yoursite.com/_functions/pdxAdmin?action=ping"

# Pending reports (admin JWT)
curl -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  "https://yoursite.com/_functions/pdxAdmin?action=pending"

# Approve report
curl -X POST -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","reportId":"uuid-here"}' \
  "https://yoursite.com/_functions/pdxAdmin"
```

---

## Database

No schema changes required. This integration uses the existing tables:

- `profiles`, `expense_reports`, `expense_line_items`, `app_settings`

Run existing migrations if not already applied (see root `README.md`).
