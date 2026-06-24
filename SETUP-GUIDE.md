# Southline AI Receptionist — Full Setup Guide

This is your playbook, Ryan. It takes you from zero to a **live AI receptionist answering a real phone** for a paying client. Follow it top to bottom the first time; after that, onboarding a new client takes about 10 minutes.

There are two halves:

- **Part A — One-time setup** (you do this once for your whole agency)
- **Part B — Onboard a client** (you repeat this per customer)

And at the end:

- **Part C — What to send the client** (the export pack)
- **Part D — The summit cheat-sheet** (what to actually do on stage tomorrow)

---

## The big picture (read this first)

Three pieces make the receptionist work:

| Piece | What it does | Who provides it |
|-------|--------------|-----------------|
| **Vapi** | Runs the phone call — connects the phone line, the voice, and the brain | vapi.ai (per-minute) |
| **The brain** | Decides what to say (Claude) | Vapi's built-in models, or your own Anthropic key |
| **The webhook** | Catches each lead and texts it to the client | `server/log-lead.js` (yours) |

A caller rings → Vapi answers → the brain has the conversation → when it has the details, it calls your webhook → the client gets a text. That's the whole loop.

You **do not** need to be technical. Most of this is filling in forms and copy-paste.

---

## Part A — One-time setup

### A1. Create a Vapi account
1. Go to **dashboard.vapi.ai** and sign up.
2. Add a payment method (it's pay-as-you-go, roughly **$0.05–0.10 per minute** of call).
3. On the left, find **API Keys**. Copy your **Private Key** — you'll need it for the provisioning script. Keep it secret.

### A2. (Optional) Pick a voice on ElevenLabs
Vapi has built-in voices, so you can skip this to start. For the best human-sounding voice:
1. Sign up at **elevenlabs.io**.
2. Browse **Voices**, find one you like (warm Irish/UK accent works great for tradespeople).
3. Copy its **Voice ID**. That's the `voiceId` in the config.
4. In Vapi **Settings → Provider Keys**, paste your ElevenLabs API key so Vapi can use it.

> Default in the template (`21m00Tcm4TlvDq8ikWAM`) is "Rachel", a clear, friendly built-in voice — fine to demo with.

### A3. (Optional) Use your own Claude key for the brain
Vapi can use Claude out of the box. If you want full control of cost/quality:
1. Go to **console.anthropic.com → Billing**, add credits.
2. **API Keys → Create Key**, copy the `sk-ant-...` key.
3. In Vapi **Settings → Provider Keys**, paste it under Anthropic.
The template already asks for `claude-opus-4-8` (the smartest model).

### A4. Deploy the lead webhook (so clients get texts)
This is the one bit of "hosting". You only do it **once** — the same server handles all your clients.

**Easiest: Render.com (free tier works)**
1. Push this repo to GitHub (already done on your branch).
2. On **render.com**, click **New → Web Service**, connect the repo.
3. Settings:
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `node log-lead.js`
4. Add **Environment variables** (from `server/.env.example`):
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (from console.twilio.com)
   - `DEFAULT_OWNER_PHONE` (your phone, as a fallback)
5. Deploy. Render gives you a URL like `https://southline-receptionist.onrender.com`.
6. Your webhook URL is that + `/log-lead`, e.g.
   `https://southline-receptionist.onrender.com/log-lead`

**Want to test on your laptop first?**
```bash
cd server
npm install
cp .env.example .env      # then edit .env with your Twilio details
node log-lead.js          # runs on http://localhost:3000
npx localtunnel --port 3000   # gives you a temporary public URL to use as the webhook
```
Visit `http://localhost:3000/leads` to watch leads land in real time.

> No Twilio yet? The webhook still runs in **log-only mode** — it prints the lead to the console instead of texting. Perfect for the summit demo.

### A5. Set up Twilio (the texting + phone numbers)
1. Sign up at **console.twilio.com**, add a little credit.
2. Copy your **Account SID** and **Auth Token** into the webhook's env vars (A4).
3. Buy a number under **Phone Numbers → Buy a number** (an Irish or local number). This is the number a client forwards their calls to.

✅ **Part A done.** You now have: a Vapi account, a deployed webhook, and a Twilio number. You never repeat Part A.

---

## Part B — Onboard a client (repeat per customer)

### B1. Gather the client's details (5-min phone call or form)
You need: business name, what they do, area, opening hours, services, rough pricing, and **the phone number leads should be texted to**.

### B2. Generate their assistant
Open `scripts/provision-client.js`, edit the `DEFAULT_CLIENT` block with their details (or make a small JSON file and pass it in). Then:

```bash
export VAPI_PRIVATE_KEY=your_vapi_private_key
node scripts/provision-client.js
# or:  node scripts/provision-client.js my-client.json
```

This **creates the live assistant in Vapi** and prints an **Assistant ID**. It also saves a copy to `clients/<business>.json` you can keep or send them.

> No code? You can instead open `vapi/assistant.template.json`, replace every `{{PLACEHOLDER}}` by hand, and paste it into the Vapi dashboard under **Assistants → Create → (advanced/JSON)**. Same result.

### B3. Give the assistant a phone number
In the Vapi dashboard:
1. **Phone Numbers → Buy / Import** (or connect your Twilio number from A5).
2. Assign that number to **this client's assistant**.

### B4. Point the webhook at this client
The provisioning script already stamps the client's `ownerPhone` and `businessName` into the assistant's **metadata**, so your single webhook automatically texts the **right** owner. Nothing else to do.

### B5. Test it
Call the assistant's number from your own phone. Have the conversation. Confirm:
- It greets with the client's name ✅
- It captures name + number + reason ✅
- The lead text lands on the owner's phone ✅

### B6. Tell the client to forward their calls
The client keeps their existing number. They just set up **call forwarding** so missed/after-hours calls go to the Vapi number. (See `CLIENT-ONBOARDING.md` — send them that.)

✅ **Client live.** Bill them monthly (€99 Starter / €199 Pro from the pricing page).

---

## Part C — What to send the client (the export pack)

Send the customer **`CLIENT-ONBOARDING.md`** (or paste it into an email). It tells them, in plain English:
- what the service does,
- the one thing they need to do (call forwarding, with steps for each network),
- how leads will reach them,
- who to contact (you).

You can also send them their `clients/<business>.json` if they want a record, and a link to the live demo page so they can see it answer.

---

## Part D — Summit cheat-sheet (do this tomorrow)

You don't need any of the backend live to wow people. The **browser demo** (`index.html`) runs offline and sounds great.

**On stage / at the stand:**
1. Open the demo page on your laptop or phone (have it pre-loaded — see README for the live link).
2. In **Demo settings**, type the prospect's **real business name**.
3. Hit **▶ Play live demo call**. It answers as *their* business, books a job, and shows the lead text landing. ~40 seconds. Jaws drop.
4. For the brave: hit **🎙 Talk to it** (use Chrome) and let them actually *talk* to it.
5. Close with: *"That's answering every call you'd otherwise miss, 24/7, from €99 a month. Want it live on your number this week?"*

**Backup plan:** if wifi/mic is flaky, the **Auto demo** is fully scripted and offline — it cannot fail. Lead with that.

---

## Making it answer every question (the "AI backup")

You wanted it to feel like a real person who has every answer — and to look things up when it doesn't. Here's how that works at each layer:

**1. On a real phone call (the actual product):** Claude *is* the brain, so it already answers naturally — hours, prices, services, "do you cover my area", "can you come today". You feed it the facts in three places in the assistant config: `OPENING HOURS`, `SERVICES`, `PRICING`, and the new **`{{FAQ}}`** field (put the 5–10 questions clients get asked most — payment methods, areas covered, parking, how soon, guarantees). The provisioner asks for this as `faq`.

**2. When it doesn't know:** the system prompt tells it **never to guess**. It says "let me check that with the team and we'll come straight back to you" and takes the caller's name + number — so you never lose the lead. That's the correct, trustworthy behaviour (better than inventing a wrong price).

**3. To literally look things up:** attach a **knowledge base** to the assistant in Vapi (upload the client's price list / FAQ PDF / a copy of their website) — Claude then searches it before answering. For web lookups you can add a search tool. Start with a good `{{FAQ}}`; add a knowledge base once a client has lots of detail.

**In the browser demo:** the **🧠 AI backup** does the same thing. It answers common questions from the local brain; for anything else it shows "checking that for you…" and either (a) really asks Claude if you paste a key in *Demo settings → AI backup*, or (b) gracefully takes a message. For a client front-end, use `server/ai-answer.js` so the key lives on the server, never in the page. **For the summit, leave the key blank** — the local brain already handles the common questions and the take-a-message fallback looks completely natural.

---

## Costs at a glance (so you can price confidently)

| Item | Rough cost | Who pays |
|------|-----------|----------|
| Vapi call time | ~$0.05–0.10 / min | You (build into the plan) |
| Voice (ElevenLabs) | pennies / min | You |
| Brain (Claude) | cents / call | You |
| Twilio number + SMS | ~€1/mo + a few cent / text | You |
| **Your price to client** | **€99–199 / mo** | **Client** |

Your margin is healthy even on the Starter plan. The more clients on one webhook, the better it gets.

---

## Troubleshooting

- **No text arrives:** check Twilio creds in the webhook env, and that the assistant's metadata `ownerPhone` is in `+353...` format.
- **Assistant won't create:** make sure `VAPI_PRIVATE_KEY` is the **private** key, not public.
- **Voice sounds robotic:** set an ElevenLabs `voiceId` and add your ElevenLabs key in Vapi provider settings.
- **Live mic demo does nothing:** that feature needs Chrome/Edge. Use Auto demo elsewhere.

Questions while you're setting up? You've got the example config in `vapi/assistant.example-joes-plumbing.json` as a reference for what a finished one looks like.
