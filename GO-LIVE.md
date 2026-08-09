# GO LIVE — from repo to a sellable AI receptionist

One ordered checklist. Do it top to bottom **once** (~1 hour). After that, each new client is ~10 minutes. No coding — it's accounts, copy-paste, and clicks.

> **Two milestones:**
> - **Steps 1–6 = a working receptionist** that answers, captures leads, books (simulated calendar), and transfers. Enough to demo live and start selling.
> - **Steps 7–8 = the full product** — real SMS lead alerts + real Google Calendar bookings.

Tick as you go.

---

## Step 0 — Accounts to create (5 min)
- [ ] **Vapi** — dashboard.vapi.ai (runs the call) — add a card (pay-as-you-go, ~$0.05–0.10/min)
- [ ] **Render** — render.com (hosts your server, free tier) — sign in with GitHub
- [ ] **Twilio** — console.twilio.com (lead texts + phone numbers) — add a little credit
- [ ] *(later)* **Google Cloud** — for real calendar bookings (Step 8)

---

## Step 1 — Deploy the server (~15 min)
This is the brain's hands — it texts leads, checks availability, books. One deploy serves **all** your clients.
- [ ] On **render.com → New → Web Service** → connect your `relier-` repo
- [ ] Settings: **Root directory** `server` · **Build** `npm install` · **Start** `node log-lead.js`
- [ ] Deploy. Copy the URL it gives you, e.g. `https://southline-receptionist.onrender.com`
- [ ] Visit that URL — you should see "webhook is running ✅"
- [ ] **Your webhook base** = that URL. Write it down. (Full detail: `SETUP-GUIDE.md` A4.)

---

## Step 2 — Build the assistant with your real URL (~5 min)
- [ ] Edit `ai-receptionist/build.js` (or make a client file): set `webhookBase` to your Render URL from Step 1
- [ ] Run `node ai-receptionist/build.js` → produces `ai-receptionist/<business>.assistant.json`
- [ ] Confirm it printed your 5 tools (log_lead, check_availability, book_appointment, submit_booking, transferCall)

---

## Step 3 — Create the assistant in Vapi (~5 min)
- [ ] Vapi → **Assistants → Create → (JSON / advanced)** → paste the file from Step 2
- [ ] *(Optional)* Set a nicer **ElevenLabs voice** (Vapi → Provider Keys) — built-in voice is fine to start
- [ ] Save

---

## Step 4 — Buy a number & connect it (~5 min)
- [ ] Vapi → **Phone Numbers → Buy a number** (Irish/local)
- [ ] **Assign** that number to your assistant (dropdown on the number)
- [ ] This is the **AI's number**. The client keeps theirs and forwards to it. (Detail: `PHONE-SETUP.md`.)

---

## Step 5 — Test the call (~5 min)
Ring the AI's number from your phone and check:
- [ ] It greets in the business name
- [ ] Ask a question → it answers from the knowledge
- [ ] "Book me tomorrow at 10" → it checks availability and books (offers 11 if 10's taken)
- [ ] "Speak to a person" → it transfers
- [ ] *(after Step 7)* a **lead text** lands on the owner's phone

✅ **At this point you have a working receptionist you can demo and sell.**

---

## Step 6 — Hand a client live (~10 min each)
- [ ] Gather their details (name, type, hours, services, pricing, FAQ, owner's mobile)
- [ ] Build their assistant: `node ai-receptionist/build.js their-profile.json`
- [ ] Paste into Vapi, buy/assign a number
- [ ] Send them `CLIENT-ONBOARDING.md` → they switch on **call forwarding** (`**61*<AI-NUMBER>#`)
- [ ] Bill them monthly (€99 / €199)

---

## Step 7 — Turn on lead text alerts (Twilio) (~10 min)
- [ ] Twilio → copy **Account SID** + **Auth Token**, buy a **number**
- [ ] On Render → your service → **Environment**, add:
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `DEFAULT_OWNER_PHONE`
- [ ] Redeploy → now every call texts the owner the lead (urgent flagged) ✅

---

## Step 8 — Turn on real Google Calendar bookings (~10 min)
- [ ] Follow **`CONNECT-GOOGLE-CALENDAR.md`** (service account → share the client's calendar → set `GOOGLE_CALENDAR_ID`, `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `TIMEZONE`)
- [ ] Redeploy → server log reads `Google Calendar LIVE`
- [ ] Test: "book me tomorrow at 10" → real event appears in the calendar ✅

---

## Step 9 — (Optional) Post-call automation & CRM
- [ ] Import `automation/n8n-receptionist-postcall.json` + `automation/n8n-daily-summary.json` into n8n (`automation/README.md`)
- [ ] Point the assistant's `log_lead` at the n8n webhook for: CRM log → owner SMS → calendar → caller confirmation → follow-up → daily summary
- [ ] Use the **CRM dashboard** to work your call-backs

---

## Step 10 — Go sell
- [ ] Demo link ready on your phone: the live demo + the CRM
- [ ] Lead list to call (the hiring-receptionist businesses)
- [ ] Opener: *"Before you spend €25–30k on a receptionist — answers every call 24/7, books appointments, texts you every lead, for a tenth of the cost."*
- [ ] Free 14-day trial → forward their calls → bill monthly

---

### Quick reference — which doc for which step
| Step | Doc |
|---|---|
| Server deploy, full setup | `SETUP-GUIDE.md` |
| Build/deploy the assistant | `ai-receptionist/README.md` |
| Numbers & forwarding | `PHONE-SETUP.md` |
| Real calendar | `CONNECT-GOOGLE-CALENDAR.md` |
| Send to the client | `CLIENT-ONBOARDING.md` |
| Automation & CRM | `automation/README.md` |
| Selling on the day | `SUMMIT-PITCH.md` |

**Minimum to start selling: Steps 1–6. Full product: add 7–8. Scale: 9.**
