# v3 Upgrade — Helpdesk emails, Roles, Expenses, Reports, WhatsApp

## Part A — Database (5 min)
1. Open `migration-3.sql`, REPLACE `YOUR-ADMIN-EMAIL` with your own login email.
2. Supabase → SQL Editor → New query → paste → Run.
   Adds: staff_roles (rights management), expenses (with approval flow), feedback (customer responses).
   Security is enforced BY THE DATABASE for expenses: engineers can only see their own.

## Part B — Upload files to GitHub (5 min)
Repo ROOT (Add file → Upload files): `package.json` (replaces — adds Excel library)
Inside `src` folder (click into src first!): upload these — 4 replace, 4 new:
- `App.jsx` (replace)  - `AmcApp.jsx` (replace)
- `ExpensesTab.jsx` (new)  - `ReportsTab.jsx` (replace old behaviour — new file name is same? NO: new file)  
  → files to upload into src: App.jsx, AmcApp.jsx, ExpensesTab.jsx, ReportsTab.jsx, TeamTab.jsx, FeedbackPage.jsx
Commit → Vercel auto-rebuilds → hard refresh (Ctrl+Shift+R).

## Part C — Roles (2 min)
Log in as yourself → new **Team** tab → add each staff email with role:
- **admin** (you): everything
- **accounts**: dashboard, tickets, expenses, reports
- **engineer**: asset scanning, tickets, attendance, own expenses only
Creating the role does NOT create the login — logins are still made in Supabase → Authentication → Users (same email).

## Part D — Automatic emails (15 min, free)
Uses Resend (free 3,000 emails/month, 100/day).
1. Sign up at https://resend.com → API Keys → Create → copy the key (starts `re_`).
2. Supabase → **Edge Functions** → Create function → name: `ticket-emails` → paste the code from
   `supabase/functions/ticket-emails/index.ts` → Deploy.
3. Edge Functions → ticket-emails → **Secrets** (or Project Settings → Edge Functions → Secrets), add:
   - `RESEND_API_KEY` = your key
   - `APP_URL` = https://idc-egs.vercel.app
   - `FROM_EMAIL` = IDC Support <onboarding@resend.dev>   ← works instantly for testing
4. Supabase → **Database → Webhooks** → Create:
   - Name: ticket-emails · Table: `tickets` · Events: **Insert** and **Update**
   - Type: Supabase Edge Function → select `ticket-emails` → Create.
5. Test: create a ticket for a customer that has an email → they get an acknowledgement.
   Mark it Resolved → they get the feedback email with the 4-question form link.
   Feedback answers appear in Reports tab → "Customer feedback received".
6. To send from your own domain (support@yourdomain.in): Resend → Domains → add domain →
   create the DNS records shown → then change FROM_EMAIL secret.

## Part E — WhatsApp (optional, ~1 hr, needs a spare number)
Reality: Meta's official API cannot read GROUP messages. The professional setup is a dedicated
support number customers message directly; each message auto-creates a ticket + auto-reply.
1. https://developers.facebook.com → Create App → type "Business" → add **WhatsApp** product.
2. Add/verify a phone number (use a new SIM — a number already on normal WhatsApp must be deleted from it first).
3. Supabase → Edge Functions → Create `whatsapp-webhook` → paste code from
   `supabase/functions/whatsapp-webhook/index.ts` → Deploy. In function settings, DISABLE "Verify JWT".
4. Secrets: `WHATSAPP_VERIFY_TOKEN` = any password you invent. For auto-replies also add
   `WHATSAPP_TOKEN` (Meta permanent token) and `WHATSAPP_PHONE_ID` (from the WhatsApp setup page).
5. Meta App → WhatsApp → Configuration → Webhook:
   - Callback URL: your function URL (Edge Functions page shows it)
   - Verify token: the same password → Verify and Save → Subscribe to `messages`.
6. Customer phone numbers in your Customers tab must match their WhatsApp numbers (last 10 digits).
Announce in your customer groups: "For fastest service, WhatsApp complaints directly to +91-XXXX — you'll get an instant ticket number."

## Reports (built in — Reports tab)
1. Engineer performance (tickets handled/resolved, repeat calls within 30 days on same asset, service reports, site visits, minutes on site)
2. Company-wise tickets raised/resolved/pending
3. Expense report — detail + engineer-wise summary, filter by month
4. AMC contracts & renewal status
5. FULL BACKUP — every table as a sheet in one Excel file. Run weekly, save to your NAS. This is your disaster-recovery copy: even if the whole system dies, your data is in Excel.
