# Upgrading to v2 — Assets, QR labels, Tickets, Attendance

You already have v1 live. This upgrade is 3 steps: run one SQL file, upload 8 files to GitHub, done. Vercel redeploys automatically. No changes needed to environment variables.

## Step 1 — Database (2 min)
Supabase → SQL Editor → New query → paste ALL of `migration-2.sql` → Run.
This adds 4 new tables (assets, tickets, service_reports, attendance). Existing data is untouched.

## Step 2 — Upload files to GitHub (5 min)

**In the repo ROOT** (main page → Add file → Upload files), upload — it will REPLACE the old one:
- `package.json`   (adds the QR code library)

**Inside the `src` folder** (click the src folder first, THEN Add file → Upload files), upload these 7:
- `App.jsx`          (replaces — adds QR link routing)
- `AmcApp.jsx`       (replaces — new tabs)
- `AssetsTab.jsx`    (new)
- `AssetPage.jsx`    (new)
- `TicketsTab.jsx`   (new)
- `AttendanceTab.jsx`(new)
- `checklists.js`    (new)

Commit. Vercel rebuilds automatically (~1 min). Hard refresh the site (Ctrl+Shift+R).

## Step 3 — Test the QR workflow (5 min)
1. Assets tab → Add asset → pick a customer, device type, serial number → Save. It gets a code like IDC-0001.
2. Click "Print QR label" → print on your barcode printer (label layout is 62mm width, adjust printer settings to fit).
3. Scan the printed QR with your phone camera → it opens the app → log in once → you see the asset page:
   - GREEN "UNDER AMC" banner if the customer has an active contract, RED "NOT UNDER AMC — chargeable" if not
   - Last service date and full history
4. Tap "Start service report" → tick the checklist → pick condition + issue from dropdowns → Submit.
5. Back on your laptop: Reports tab shows the submitted report instantly.

## How each feature works
- **Assets**: every customer device registered with unique code + serial. The QR encodes a link to that asset's page. Customer cannot claim a non-AMC machine is covered — the scan shows the truth.
- **Tickets**: log complaints, set priority, assign engineer, one-tap Start/Resolve.
- **Attendance**: engineer taps Check in on arriving at site (GPS captured), Check out when leaving. You see time on site and map links.
- **Reports**: every submitted service checklist, newest first — your proof-of-value file at renewal time.

## Engineer instructions (share this with your team)
1. Open idc-egs.vercel.app on your phone, log in once (stays logged in).
2. On reaching site: Attendance tab → select customer → Check in (allow location).
3. For each machine: scan the QR sticker with the phone camera → check AMC status → do the service → Start service report → tick boxes → Submit.
4. Machine has no sticker? Ask office to register it first — do NOT service unregistered machines under AMC.
5. Leaving site: Attendance tab → Check out.

## Tip: add the app to phone home screen
Chrome on Android: open the site → 3-dot menu → "Add to Home screen". It behaves like an app icon.
