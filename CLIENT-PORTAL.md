# Client login — each client sees their own leads

Every client gets their own **account** to log into the CRM. They use the **same dashboard URL**, but log in and see **only their own** calls and bookings. The scoping happens **on the server** (a login screen alone isn't security).

## How it works
- Accounts live in the `CLIENT_ACCOUNTS` env var on your server (a JSON array; passwords are hashed with scrypt — never stored in plain text).
- Client logs in → server checks the password → issues a token → the CRM calls `/my-leads`, which returns **only that client's** leads (matched by their business name).
- The business name in the account **must match** the `businessName` in that client's assistant metadata (the provisioner sets it), so their leads line up.

## Create an account for a client
```bash
node scripts/create-client-account.js "joe@joesplumbing.ie" "Joe's Plumbing" "aSolidPassword"
```
It prints a JSON object. Add it to the `CLIENT_ACCOUNTS` array on your server (Render → Environment), e.g.:
```
CLIENT_ACCOUNTS=[{"username":"joe@joesplumbing.ie","business":"Joe's Plumbing","salt":"…","hash":"…"}]
```
Redeploy. Then give the client:
- **The CRM link** (your dashboard URL)
- **Their email + password**

That's it — they log in and see their own inbox, pipeline, appointments and call-backs.

## What the client can do
- See every call: who, the problem, who to call back, urgency, status
- Work the pipeline (drag New → To call back → Booked → Closed), add notes, one-tap call-back
- View their appointments
- They **only** ever see their own data.

## Notes
- **On the deployed demo** (no server connected) the login screen still appears — anyone can click **"View the demo (sample data)"** to see the dashboard with example calls. Real client logins need the server deployed (`GO-LIVE.md`).
- Out of the box there's a built-in demo account for testing: `demo@clinic.com` / `demo1234` (business "Southline Demo Clinic"). Remove it in production by setting your own `CLIENT_ACCOUNTS`.
- Tokens expire after 12 hours; the client just logs in again.
- For more clients, add more objects to the `CLIENT_ACCOUNTS` array — the same server serves them all, each scoped to their own data.
