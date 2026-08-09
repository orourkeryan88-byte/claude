# Linking a phone number to the AI Receptionist

The receptionist needs its **own** phone number. You then connect the client's real number to it. You don't put the AI "inside" their existing line — you point their line at the AI.

This page covers: (1) give the receptionist a number, then (2) connect the client's number — three ways.

---

## Step 1 — Give the receptionist its own number (once per client)

1. **Vapi dashboard → Phone Numbers → Buy a number** (or **Import** a Twilio number you already own). Pick an Irish/local number — about €1–2/month.
2. **Assign the number to that client's assistant** — on the number's settings there's an **Assistant** dropdown. Select the client's receptionist (e.g. "Joe's Plumbing Receptionist").
3. **Test it:** ring that number from your own phone. The AI should answer in the client's name. ✅

That number is now the AI's line. Next, connect the client's real number to it.

---

## Step 2 — Connect the client's number (pick one)

### Option A — Call forwarding ✅ (use this almost every time)

The client **keeps their existing number**. They forward calls to the AI's number. Customers dial the same number as always; it rings through to the AI. Fast, free, reversible, works on any mobile or landline.

The client dials a short code from their business phone:

| When to forward | Dial this | Turn off |
|---|---|---|
| When they **don't answer** (recommended) | `**61*<AI-NUMBER>#` then call | `##61#` |
| When the line is **busy** | `**67*<AI-NUMBER>#` then call | `##67#` |
| When **unreachable** (off/no signal) | `**62*<AI-NUMBER>#` then call | `##62#` |
| **Every** call (after-hours / AI-first) | `**21*<AI-NUMBER>#` then call | `##21#` |

Replace `<AI-NUMBER>` with the Vapi number from Step 1. The recommended setup is the first three together: the client still answers when they can, and the AI catches everything they miss.

> Landline / VoIP / different network? The wording varies — most providers have "call forwarding" in their app or account settings, or you ring the client and set it up together in 2 minutes.

### Option B — Use the AI number as their public number

Give the client the fresh Vapi number and they advertise **that** one — website, Google Business Profile, the van, flyers, ads. No forwarding needed. Great for new businesses or a dedicated "bookings line".

### Option C — Port their real number into Vapi

If the client wants the AI to answer their **actual advertised number directly** (no forwarding at all), you **port** the number into Vapi/Twilio. That number then *is* the AI's line.

- Most seamless for callers, but: takes a **few business days**, needs a porting form + proof of ownership, and moving it back out later is a hassle.
- Use this only when a client specifically asks for it. For everyone else, Option A is better.

---

## The full call journey (so you can explain it)

```
Customer dials the client's normal number
        │
        ├─ Client answers  → normal call, done
        │
        └─ No answer / busy / after hours
                 │  (call forwarding)
                 ▼
        AI Receptionist (the Vapi number) answers
                 │
                 ├─ Answers questions, books the job → texts the lead to the owner
                 │
                 └─ Caller wants a person / complex issue
                          │  (transferCall tool)
                          ▼
                 Transfers to the owner's mobile
```

The transfer step uses the `transferCall` tool in the assistant — the provisioner sets it to the owner's number automatically.

---

## What to say to the client

> "Keep your number — nothing changes for your customers. We give you a smart line, and your phone just forwards to it when you can't pick up. Takes two minutes to switch on, and you can turn it off any time."

That's **Option A**. It's the answer 95% of the time.

---

## Quick checklist per client

- [ ] Bought a Vapi number and **assigned it to their assistant**
- [ ] Test call — AI answers in the client's name
- [ ] Lead text arrives on the owner's phone
- [ ] Sent the client their forwarding code (`**61*<AI-NUMBER>#`)
- [ ] Confirmed a forwarded call reaches the AI
- [ ] (Optional) set the transfer-to-human number to the owner's mobile

Questions while setting up? Everything else is in `SETUP-GUIDE.md`.
