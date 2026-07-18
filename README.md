# AMC Command Center — Deployment Guide (Vercel + Supabase)

A shared customer + AMC contract management app for India Digital Corporation and EasyGo Solutions. One central database, individual staff logins, accessible from any browser.

Total time: ~30 minutes. Total cost: ₹0 on free tiers.

---

## Part 1 — Supabase (database + logins), ~10 minutes

1. Go to https://supabase.com → sign up (use your Google account) → **New project**.
   - Name: `idc-amc`
   - Database password: set a strong one and save it in your password manager.
   - Region: **Mumbai (ap-south-1)** — keeps data in India and latency low.
2. Wait ~2 minutes for the project to provision.
3. **Create the tables:** left sidebar → **SQL Editor** → **New query** → paste the entire contents of `supabase-schema.sql` (in this folder) → **Run**. You should see "Success".
4. **Turn off public signups** (so only you create accounts):
   - Left sidebar → **Authentication** → **Sign In / Up** (or Providers → Email settings depending on UI version)
   - Disable **"Allow new users to sign up"**.
5. **Create staff accounts:** Authentication → **Users** → **Add user** → enter each staff member's email + a temporary password → tick "Auto confirm user". Repeat for yourself and each engineer.
6. **Copy your keys:** Project Settings (gear icon) → **API**:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon / public key** → this is `VITE_SUPABASE_ANON_KEY`
   (The anon key is safe to expose in the frontend — row-level security means nobody can read data without logging in.)

## Part 2 — Push code to GitHub, ~5 minutes

1. Create a new **private** repository on https://github.com (e.g. `idc-amc`).
2. From this project folder on your machine:
   ```bash
   git init
   git add .
   git commit -m "AMC Command Center v1"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/idc-amc.git
   git push -u origin main
   ```
   (`.gitignore` already excludes `.env` and `node_modules`.)

## Part 3 — Vercel (hosting), ~10 minutes

1. Go to https://vercel.com → sign up with your GitHub account → **Add New → Project** → import the `idc-amc` repo.
2. Vercel auto-detects Vite. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
3. Click **Deploy**. In ~1 minute you get a live URL like `idc-amc.vercel.app`.
4. **Custom domain (optional but recommended):** Project → Settings → Domains → add `amc.yourdomain.in`, then create the CNAME record Vercel shows you at your domain registrar. HTTPS is automatic.

## Part 4 — Test

1. Open the live URL → you should see the login screen.
2. Sign in with an account you created in Part 1 step 5.
3. Add a test customer and contract → sign in from your phone → confirm the same data appears. That confirms the shared database is working.

---

## Running it locally (for development)

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run dev               # opens at http://localhost:5173
```

## Day-2 operations

- **Add/remove staff:** Supabase → Authentication → Users. Removing a user instantly revokes access.
- **Backups:** Supabase free tier keeps daily backups for 7 days. Also export monthly: Table Editor → each table → Export CSV.
- **Updating the app:** edit code → `git push` → Vercel redeploys automatically.
- **Free tier limits:** 500 MB database and 50,000 monthly active users — you will not hit these for years with this workload.

## Security notes

- Public signup is disabled, so the login page is the only door and only accounts you create can enter.
- Row Level Security is enabled on all three tables — the database rejects any request without a valid login, even if someone has your anon key.
- Use strong passwords for staff and change the temporary ones on first login (Supabase → user → send password recovery, or set a new one directly).
