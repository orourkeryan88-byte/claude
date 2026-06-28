# Backend go-live — what you create, what I do

I can't sign up for these services myself (they need your card / your identity / your phone
number) but once you've got each one, paste me the key and I'll wire it straight into the
server, push it, and deploy — you won't touch any code.

Do these **in this order**. After each step, just paste me what's asked for and say "next."

## 1. Render (hosts the backend — do this first, it's free)

1. Go to render.com → sign up (GitHub login is fastest — connect your `orourkeryan88-byte/relier-` repo).
2. New → Blueprint → pick this repo. Render will read `render.yaml` (already in the repo) and
   propose one service: `southline-ai-receptionist`.
3. Click **Apply**. It'll deploy with placeholder env vars and go live at a URL like
   `https://southline-ai-receptionist.onrender.com`.
4. Paste me that URL. I'll set `DASHBOARD_URL` and `PUBLIC_BASE_URL` to the right values for
   you in the Render dashboard (or tell you the two values to paste into Render's env tab —
   whichever you prefer).

→ At this point: the webhook is live, `/log-lead` works in log-only mode, calendar runs in
demo mode, sign-up stores accounts but billing is off. That alone is enough to demo on a
real number once Vapi is connected.

## 2. Vapi (the phone brain)

1. vapi.ai → sign up → Settings → API Keys → copy the **Private Key**.
2. Paste me the key. I'll add it to Render as `VAPI_PRIVATE_KEY` and trigger the provisioning
   pipeline so it auto-creates the assistant + buys a number on next sign-up — or I can create
   one right now for a test client if you give me a business name.

## 3. Twilio (SMS to you when a lead comes in)

1. twilio.com → sign up → copy **Account SID** and **Auth Token** from the console home page.
2. Buy a number (or use the trial number) under Phone Numbers → Buy a Number.
3. Paste me: Account SID, Auth Token, the Twilio number.
4. I'll set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, and
   `DEFAULT_OWNER_PHONE=085 174 0783` on Render.

## 4. Stripe (the €350 + €80/mo charge)

1. stripe.com → sign up → Developers → API keys → copy the **Secret key** (use the test key
   first so we can do a £0-risk test payment before going live).
2. Developers → Webhooks → Add endpoint → URL = `<your Render URL>/stripe-webhook` → events to
   send: `checkout.session.completed`, `customer.subscription.deleted` → copy the **Signing
   secret**.
3. Paste me both. I'll set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on Render.
4. We test a sign-up end to end with a Stripe test card, confirm provisioning fires, then you
   flip to the live secret key when ready to take real payments.

## 5. Google Calendar (real booking instead of demo mode)

1. console.cloud.google.com → new project → enable "Google Calendar API".
2. IAM & Admin → Service Accounts → create one → Keys → create JSON key → download it.
3. Open that JSON file → paste me the `client_email` and `private_key` fields (the private_key
   is long, that's fine, paste the whole thing including `-----BEGIN/END PRIVATE KEY-----`).
4. Open the calendar you want bookings to land on → Settings → Share with specific people →
   add that `client_email` → give it "Make changes to events" → paste me the Calendar ID
   (Settings → "Integrate calendar" → Calendar ID, looks like `something@group.calendar.google.com`).
5. I'll set `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` on Render.

---

**You only need step 1 to have something live on the internet today.** Steps 2-5 can land
one at a time, whenever you get to each account — nothing breaks if some are missing, the
server just falls back to demo/log-only mode for whichever piece isn't configured yet
(that's by design, see `server/provision-pipeline.js`).
