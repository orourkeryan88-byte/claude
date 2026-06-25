# Southline AI Receptionist

A 24/7 AI receptionist you can sell to tradespeople and clinics. It answers every call, books the job, and texts the owner the lead. This repo is the **whole product** — a live demo to sell it, the config to deploy it, and the guides to run it.

> Built by **Southline** · 085 174 0783 · agencysouthline@gmail.com

---

## What's in here

| File / folder | What it is | Use it to… |
|---|---|---|
| **`index.html`** | A live, offline-capable voice demo. Open it in a browser. | **Sell it** at the summit — it talks, listens and captures a lead live. |
| **`dashboard/index.html`** | A HubSpot-style CRM: tracks every call, the problem, who to call back, status pipeline. Works offline (sample data) or syncs live from the webhook. | **Manage leads** — the place clients work their callbacks. |
| **`SETUP-GUIDE.md`** | Plain-English setup, start to finish. | **Run it** — get a client live in ~10 min. |
| **`CLIENT-ONBOARDING.md`** | One-pager to send the customer. | **Export it** — what the client does (call forwarding). |
| **`PHONE-SETUP.md`** | How to give the receptionist a number and link the client's number to it. | **Connect the phone** — buy/assign a number, forwarding, porting. |
| `vapi/assistant.template.json` | The Vapi assistant template (placeholders). | Deploy a new client's receptionist. |
| `vapi/assistant.example-joes-plumbing.json` | A finished example. | See what "done" looks like. |
| `server/log-lead.js` | Lead webhook — texts the owner via Twilio. | Catch leads from calls. |
| `server/calendar.js` | Google Calendar booking — `/availability` + `/book`. | Book real appointments (demo mode until connected). |
| `automation/` | n8n post-call automation — CRM log, owner SMS, calendar, caller confirm, follow-up, daily summary. | Automate everything after a call. |
| `scripts/provision-client.js` | One-command client provisioner. | Onboard a client fast. |

---

## 30-second tour

1. **Sell it:** open `index.html`, type a prospect's business name in *Demo settings*, hit **▶ Play live demo call**. It answers as their business and captures a lead. (See `SETUP-GUIDE.md` → Part D for the summit script.)
2. **Build it:** follow `SETUP-GUIDE.md` Part A once (Vapi + webhook + Twilio).
3. **Onboard a client:** `SETUP-GUIDE.md` Part B — run `provision-client.js`, attach a number, done.
4. **Hand off:** send the client `CLIENT-ONBOARDING.md`.

---

## Try the demo right now

**Offline (most reliable for the summit):** download `index.html` and open it in **Chrome**. No internet needed. The voice is generated on your device.

- **Play sample call** — fully scripted, voiced, works on any device. Can't fail. Lead with this on stage.
- **📞 Call it now** — live microphone (Chrome/Edge). Let prospects actually talk to it.
- **Demo settings** — rebrand the receptionist to any business name on the spot.

*(Optional) want a public link to pull up on your phone at the summit? Ask and we can deploy `index.html` to GitHub Pages so it's live at a URL.*

---

## Run the webhook locally (optional, for testing)

```bash
cd server
npm install
cp .env.example .env        # add your Twilio details (or leave blank for log-only mode)
node log-lead.js            # http://localhost:3000  — watch leads at /leads
```

---

## The stack

- **Vapi** — telephony + orchestration (per-minute)
- **Claude (`claude-opus-4-8`)** — the brain
- **ElevenLabs** — natural voice
- **Deepgram** — speech-to-text
- **Twilio** — phone number + lead SMS
- **This repo** — the template, the webhook, the provisioner, the sales demo

Full walkthrough and costs: **`SETUP-GUIDE.md`**.
