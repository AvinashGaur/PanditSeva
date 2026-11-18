# PanditSeva backend (Supabase) — setup guide

The website is static (GitHub Pages), so anything that needs **login, saved data, payments or admin rights**
must live on a server. This folder holds that server side. Nothing here runs on GitHub Pages.

## Why Supabase
- **Auth** (email OTP / password), **Postgres with Row Level Security**, **private file Storage** and **Edge Functions** in one product — no server of our own to maintain.
- The browser only ever holds the public *anon* key. **RLS policies in `schema.sql` are the real security**; the admin screen's role check is only UX.
- Free tier is enough to start. (Firebase would also work, but RLS + SQL fits the relational data here — orders, memberships, reports.)

## Files
| File | Purpose |
|---|---|
| `schema.sql` | Tables, RLS policies, `reports` storage bucket, role helper functions (`is_admin()`, `is_staff()`) |
| `functions/create-order/index.ts` | Logged-in user → server prices the product → creates Razorpay order → saves pending order |
| `functions/razorpay-webhook/index.ts` | Razorpay → verifies HMAC signature → marks order paid → grants membership/entitlement |

> **Status: written but UNTESTED against live services.** Test in Razorpay *Test Mode* with test keys before going live.

## Step-by-step

### 1. Create the project
1. https://supabase.com → New project (region: **Mumbai / ap-south-1**). Save the DB password.
2. Project Settings → **API**: note the **Project URL** and the **anon public** key. (Never use or expose the `service_role` key in the website.)

### 2. Create tables and security rules
Dashboard → **SQL Editor** → paste all of `schema.sql` → **Run**. Safe to re-run.

### 3. Connect the website (public values only)
Edit `js/jy-common.js` → `JY.CONFIG`:
```js
supabaseUrl: 'https://YOURREF.supabase.co',
supabaseAnonKey: 'eyJ...',          // anon public key
```
Auth → URL Configuration: set **Site URL** to `https://avinashgaur.github.io/PanditSeva/` and add `https://avinashgaur.github.io/PanditSeva/premium.html` to Redirect URLs (needed for email magic links).

### 4. Make yourself admin
1. Auth → Users → **Add user** (email + password, tick *Auto Confirm*) — this is your admin login.
2. SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Open `/admin.html`, log in. (To add an astrologer who may only upload/approve reports: create the user, then set `role = 'astrologer'` from Admin → यूज़र्स.)

### 5. Payments (Razorpay)
1. Create a Razorpay account; start in **Test Mode** (Dashboard → Account & Settings → API Keys).
2. Install the CLI and link: `npm i -g supabase && supabase login && supabase link --project-ref YOURREF`
3. Secrets (these stay on the server, never in the website):
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-string ALLOWED_ORIGIN=https://avinashgaur.github.io
   ```
4. Deploy (run from the folder that contains `functions/`, i.e. copy/symlink to `supabase/functions` or run from `backend/` after `supabase init`):
   ```bash
   supabase functions deploy create-order
   supabase functions deploy razorpay-webhook --no-verify-jwt   # Razorpay has no Supabase JWT
   ```
5. Razorpay Dashboard → Webhooks → Add: URL `https://YOURREF.supabase.co/functions/v1/razorpay-webhook`, secret = the same `RAZORPAY_WEBHOOK_SECRET`, event **payment.captured**.
6. In `js/jy-common.js` set `razorpayKeyId: 'rzp_test_xxx'` (public key id only) and `paymentEndpoint: 'https://YOURREF.supabase.co/functions/v1/create-order'`.
7. Test with Razorpay test cards/UPI. Check `orders` shows `paid` and `memberships`/`entitlements` is filled. Only then switch to Live keys.

### 6. Turn on real Premium gating
Keep `enforcePremium: false` (launch mode: everything open) until steps 1–5 are verified end to end. Then set `enforcePremium: true`.
Note: gating inside static JavaScript can always be bypassed by a determined user. Truly protected content (e.g. approved PDFs) is protected by Storage RLS; calculation features that run in the browser are only *soft*-gated.

## Payment flow & "verify-payment"
1. Browser → `create-order` (with the user's JWT, only a product id). Server looks up the price in `jy_content.pricing` (admin-editable), creates the Razorpay order, stores `orders.status='created'`.
2. Browser opens Razorpay Checkout with the returned `order_id`.
3. **The checkout success callback is not trusted.** The browser then *polls* its own order row.
4. Razorpay calls `razorpay-webhook` server-to-server. It (a) verifies `X-Razorpay-Signature` = HMAC-SHA256(raw body, webhook secret), (b) checks amount/currency equal what we priced, (c) atomically flips `created → paid` exactly once, (d) grants membership (extending valid_until) or an entitlement.
5. Once the row is `paid`, the polling browser shows success and refreshes the account panel.

This *is* the verify step: verification happens in the webhook (server-side, signed). A separate client-triggered `verify-payment` endpoint (checking `razorpay_signature` = HMAC(order_id|payment_id, key secret)) can be added later purely to speed up confirmation, but the webhook must stay the source of truth.

## Content keys (table `jy_content`, public-read, admin-write)
`pricing`, `astrologer`, `site_content`, `panchang_note_YYYY-MM-DD`, `faladesh_override_YYYY-MM-DD` (`{text}`), `rashifal_override_YYYY-MM-DD_<0-11>` (`{text}`), `babynames_extra` (array).
Pages that display these **must escape the text** (`JY.esc` or `textContent`) — it is admin-typed free text. Set `admin_only = true` on a row to hide it from the public.

## Security notes
- Secrets exist only as Supabase function secrets. Do not paste `service_role`, Razorpay secret or webhook secret anywhere in the repo.
- `orders` has no client write policy; only Edge Functions (service role) write it. Users cannot grant themselves Premium, change their role, or approve their own reports.
- Approved report PDFs live in a **private** bucket; owners can download only after `status='approved'`.
- Consider enabling Supabase Auth rate limits and CAPTCHA for the login form before heavy traffic.
