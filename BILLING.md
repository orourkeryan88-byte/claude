# Sign-up, subscription & auto-setup

Clients **create an account and pay at the gate** — €350 setup + €80/month — and the system **provisions them automatically** the moment payment clears.

## The flow

```
Create account (business, email, password)
   → Stripe Checkout  (€350 setup + €80/mo)
   → payment completes
   → Stripe webhook fires
       → account activated (they can log in)
       → 🤖 provisioning pipeline runs:
            1. Build AI assistant (creates it in Vapi)
            2. Assign phone number
            3. Activate CRM login
            4. Welcome + setup pack (login, number, forwarding steps)
```

## Turn on payments (Stripe)

1. Create a **Stripe** account → get your **Secret key** (`sk_live_…`).
2. On your server (Render → Environment) set:
   - `STRIPE_SECRET_KEY`
   - `DASHBOARD_URL` = your CRM URL (where Stripe sends them after paying)
   - *(optional)* `SETUP_FEE_CENTS=35000`, `MONTHLY_FEE_CENTS=8000` (the defaults = €350 / €80)
3. In Stripe → **Developers → Webhooks → Add endpoint** → URL `https://your-server/stripe-webhook`, event `checkout.session.completed` (and `customer.subscription.deleted`). Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy. The gate's **Create account** button now takes clients to real Stripe Checkout.

> No Stripe key yet? The "Create account" form still works — it stores the pending account and tells the user payment isn't switched on. Add the key to go live.

## Turn on auto-provisioning (optional but recommended)

The pipeline runs on every payment. To make it create the assistant and number **automatically**, set on the server:
- `VAPI_PRIVATE_KEY` — so it creates the assistant in Vapi (and tries to assign a number)
- `PUBLIC_BASE_URL` — your server's URL (so the assistant's tools point back correctly)
- `DASHBOARD_URL`, `DEFAULT_OWNER_PHONE`

Without `VAPI_PRIVATE_KEY` the pipeline still runs and **activates the login + prepares the welcome pack**, and marks the assistant/number steps "queued" with 1-click instructions — so you finish those by hand in Vapi.

Each client's progress is saved on their account and readable at `GET /setup-status` (logged in).

## Prices, accounts, security

- Passwords are hashed (scrypt) — never stored in plain text.
- A login alone isn't security: `GET /my-leads` is scoped server-side so a client only ever sees **their own** leads.
- Accounts from sign-up are stored in the account file; preset accounts can also live in `CLIENT_ACCOUNTS`. (For production, point `ACCOUNTS_FILE` at a persistent disk or swap in a database — the interface stays the same.)
- Subscription cancellations (`customer.subscription.deleted`) suspend the login automatically.

## What the client experiences

1. Opens your CRM link → **Create account** → enters business, email, password → sees **€350 setup, then €80/month**.
2. Pays on Stripe.
3. Lands back on the CRM: *"Payment received — your receptionist is being set up. Log in."*
4. Logs in → their inbox. Meanwhile the welcome pack (login + AI number + forwarding steps) is prepared, and their assistant is built.
