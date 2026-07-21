# Get your data OUT of the external services (I can't reach these — you do it)

Your actual live data doesn't live in the app (Render free tier = ephemeral).
It lives in the services below. Export from each, then import into GHL.

## 1. Stripe (your paying clients + subscriptions) — MOST IMPORTANT
- Log in at dashboard.stripe.com
- Customers → Export → CSV (names, emails, subscription status)
- This is your real client list + who's actively paying. Import into GHL Contacts,
  then set up GHL SaaS billing to take over the subscriptions going forward.
- Note: subscriptions don't "move" automatically — you re-create billing in GHL
  and cancel the old Stripe subscriptions once clients are re-billed in GHL, OR
  connect the SAME Stripe account to GHL so charges continue.

## 2. Vapi (call history, recordings, transcripts, assistant configs)
- Log in at dashboard.vapi.ai
- Assistants → open each client assistant → copy its config (already captured in
  file 1 of this pack as the master template)
- Call Logs → export/download recordings + transcripts you want to keep
- GHL has its own call logs going forward; Vapi history stays in Vapi unless you
  download it now.

## 3. Twilio (SMS history + your phone numbers)
- Log in at console.twilio.com
- Messaging → Logs → export SMS history if you need it
- Phone Numbers → note each number. To move to GHL you either PORT the number
  into GHL (LC Phone) or buy a new GHL number and update the client's call
  forwarding (**61*<newnumber># etc.)

## 4. Google Calendar (existing bookings)
- Each client calendar: Settings → Import & Export → Export (.ics)
- In GHL, connect the same Google account to the sub-account's calendar (2-way
  sync) so existing events show up — usually easier than importing the .ics.

## 5. Render (your secrets/config — for reference, not for GHL)
- Log in at dashboard.render.com → your service → Environment
- Copy down the env var VALUES (Twilio/Stripe/Vapi keys, ADMIN_PASSWORD,
  CLIENT_ACCOUNTS). You'll reuse the Twilio/Stripe keys when connecting GHL.
- CLIENT_ACCOUNTS holds any manually-created client logins — copy that JSON; it's
  your definitive manual client list.

## 6. GitHub (your code — keep as the reference/backup)
- Your repo `relier-` stays as-is. It's the source of truth for all the settings
  above. Don't delete it — it's your backup and documentation of the whole system.

---
ORDER TO DO IT: Stripe export (clients) → CLIENT_ACCOUNTS from Render (clients) →
merge into one contacts CSV (use file 3 as the header) → import to GHL → connect
Stripe + Twilio to GHL → build template sub-account (files 1 & 2) → migrate phone
numbers last.
