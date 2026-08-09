# Southline AI Receptionist — Everything

*Compiled from the live source on branch `claude/brave-lamport-jnmwcr`. This is
the real, current state of the system.*

---

## 1. What it is

A 24/7 AI phone receptionist for small service businesses (salons, clinics,
dental, med-spa, dog grooming, etc.). It answers calls in the business's name,
answers questions, books appointments into Google Calendar, texts the owner
every lead instantly, screens spam, and logs everything to a CRM dashboard.
One server runs **all** clients — each client's details (owner phone, hours,
knowledge) are passed per-assistant, so it's fully multi-tenant.

Brand: **Southline**.

## 2. Pricing (one plan, no tiers)

- **Setup:** €350 one-off (`SETUP_FEE_CENTS=35000`)
- **Monthly:** €150/month (`MONTHLY_FEE_CENTS=15000`)
- Everything included: seats 3, 365-day history.

*(Note: `server/.env.example` still shows €80/month as an old default, but the
live `render.yaml` and `plans.js` set €150. €150 is correct.)*

## 3. The stack

| Layer | Tech | Purpose |
|---|---|---|
| Voice AI | **Vapi** (`VAPI_PRIVATE_KEY`) | Answers the call, runs the assistant |
| SMS | **Twilio** | Texts leads/bookings to the owner |
| Bookings | **Google Calendar API** (service account) | Real appointment booking |
| Billing | **Stripe** (checkout + webhook) | Setup fee + monthly subscription |
| Backend | **Node/Express**, entry `server/log-lead.js` | All API routes |
| Frontend | Static pages on **GitHub Pages** | admin, dashboard, demo, chat |
| Hosting | **Render** (`southline-ai-receptionist`, free plan) | Runs the server |
| Automation | **n8n** workflows (in `automation/`) | Reminders, daily summary, post-call |

## 4. URLs

| Purpose | URL |
|---|---|
| Site root | `https://orourkeryan88-byte.github.io/relier-/` |
| Admin control centre | `.../relier-/admin/` |
| Client dashboard (CRM) | `.../relier-/dashboard/` |
| Sales demo (voice) | `.../relier-/demo/` |
| Web chat widget | `.../relier-/chat/` |
| Backend API | `https://southline-ai-receptionist.onrender.com` |

Demo personalisation: `.../demo/?biz=Business%20Name&type=salon`
(types include salon, dental, medspa, dog-grooming, service…).

## 5. Logins

### Admin (you only) — `server/admin.js`
- Email: `ADMIN_EMAIL` (default `agencysouthline@gmail.com`)
- Password: `ADMIN_PASSWORD` (default `southline-admin` — **override on Render**)

### Client accounts (CRM) — `server/auth.js`
- Real accounts live in the `CLIENT_ACCOUNTS` env var (JSON), and paying
  sign-ups are stored automatically.
- Built-in demo fallback: `demo@clinic.com` / `demo1234` (Southline Demo Clinic).
- Passwords hashed with scrypt + per-account salt.

## 6. Backend files (`server/`, ~2,055 lines)

| File | Lines | Role |
|---|---|---|
| `log-lead.js` | 224 | **Entry point** — Express app, CORS, mounts everything; Vapi `log_lead` webhook texts owner via Twilio |
| `calendar.js` | 466 | Google Calendar availability + booking, hours/lunch/buffer logic |
| `demo-voice.js` | 283 | Powers the personalised sales demo voice |
| `provision-pipeline.js` | 206 | Automated new-client provisioning |
| `admin.js` | 174 | Owner admin API (see routes) |
| `auth.js` | 130 | Client login, tokens, change-password |
| `calls.js` | 126 | Call reports, missed-call text-back |
| `billing.js` | 120 | Stripe checkout + webhook, subscription state |
| `discounts.js` | 87 | Discount codes |
| `knowledge.js` | 80 | Per-business knowledge/FAQ used by the AI |
| `ai-answer.js` | 80 | AI answering logic |
| `plans.js` | 40 | The single plan definition + pricing |
| `store.js` | 39 | Lightweight data store |

## 7. All API routes

**Public / client**
- `POST /login`, `POST /change-password`, `GET /me`
- `GET /leads`, `GET /my-leads`, `POST /log-lead`
- `GET /availability`, `POST /availability`, `POST /book`, `POST /submit-booking`,
  `GET /bookings`, `POST /cancel-booking`, `POST /reschedule-booking`
- `POST /ai-answer`, `POST /call-report`, `POST /missed-call`
- `POST /scan-website`, `GET /setup-status`, `GET /pricing`
- `POST /demo-voice`, `GET /demo-voice/health`

**Billing**
- `POST /create-checkout-session`, `POST /stripe-webhook`, `POST /validate-discount`

**Admin (owner-only, token-guarded)**
- `POST /admin/login`
- `GET /admin/overview`, `GET /admin/clients`, `POST /admin/client/update`,
  `POST /admin/onboard-client`, `POST /admin/client/reset-password`
- `GET /admin/leads`
- `GET/POST /admin/discounts`, `POST /admin/discounts/delete`
- `GET/POST /admin/product`

## 8. Environment variables (set on Render)

**Set (safe defaults):** `PORT=3000`, `TIMEZONE=Europe/Dublin`, `OPEN_HOUR=9`,
`CLOSE_HOUR=17.5`, `SLOT_MINS=30`, `SETUP_FEE_CENTS=35000`,
`MONTHLY_FEE_CENTS=15000`, `ADMIN_EMAIL=agencysouthline@gmail.com`.

**Secret (`sync:false` — you must fill in):**
`ADMIN_PASSWORD`, `CLIENT_ACCOUNTS`, `DASHBOARD_URL`, `PUBLIC_BASE_URL`,
`DEFAULT_OWNER_PHONE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`,
`VAPI_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_SA_EMAIL`,
`GOOGLE_SA_PRIVATE_KEY`.

## 9. Frontend apps

- `admin/` — installable PWA control centre (has manifest + service worker).
- `dashboard/` — client CRM PWA (pipeline, insights, revenue, call log).
- `demo/` — the personalised voice demo you send to prospects.
- `chat/` — website chat widget.
- `admin-app/` — an Electron desktop build of the admin centre.
- `ai-receptionist/` — the Vapi assistant definition + build script
  (`southline-demo-clinic.assistant.json`).

## 10. Feature set (what it genuinely does)

24/7 call answering in the business's name · books into Google Calendar ·
every lead texted to the owner instantly · missed-call text-back ·
call summaries, transcripts & recordings · spam/sales-call screening ·
website chat widget · CRM app (pipeline, insights, revenue) ·
appointment reminders + daily summary via n8n.

## 11. Setup / operations docs already in the repo

`SETUP-GUIDE.md` · `GO-LIVE.md` · `BACKEND-GO-LIVE.md` · `PHONE-SETUP.md` ·
`ELEVENLABS-SETUP.md` · `CONNECT-GOOGLE-CALENDAR.md` · `BILLING.md` ·
`CLIENT-ONBOARDING.md` · `CLIENT-PORTAL.md` · `CAPABILITIES.md` ·
`PRIORITY-TARGETS.md` · `SUMMIT-PITCH.md`.

## 12. Deployment flow

- **Backend:** Render deploys from `render.yaml` (`rootDir: server`,
  `npm install`, `node log-lead.js`). Fill the secret env vars in the Render
  dashboard.
- **Frontend:** GitHub Actions (`.github/workflows/deploy-pages.yml`) publishes
  the static folders to GitHub Pages on push.
- **Vapi:** the assistant's tool `server.url` must point at the Render URL so
  `log_lead`/booking calls reach the backend.

---
*Accurate as of the current branch head. To change pricing, edit the
`*_FEE_CENTS` env vars on Render — no code change needed.*
