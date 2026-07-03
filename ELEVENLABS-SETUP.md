# ElevenLabs — voice + making the widget book & capture leads

Two separate things live here:

1. **The voice** your phone receptionist speaks in (used by the real Vapi phone line).
2. **The website widget** (the ElevenLabs agent embedded on the demo page) — how to make
   it actually log leads and book appointments, not just chat.

---

## 1. Where you pick the receptionist's voice

Your assistant uses ElevenLabs for its voice (`"provider": "11labs"`). The voice is one
value: a **voice ID**. Two ways to choose it:

**A. In the Vapi dashboard (easiest — hear previews)**
Vapi → your Assistant → **Voice** → Provider **ElevenLabs** → pick a voice → Save.

**B. From ElevenLabs (for a specific/cloned/custom voice)**
elevenlabs.io → **Voices** → open a voice (or clone one) → **copy its Voice ID**
(e.g. `21m00Tcm4TlvDq8ikWAM`) → paste it into the assistant's `voiceId`.

**Per client:** in your **Owner Admin → Clients**, each client row has a **Voice** box.
Paste an ElevenLabs voice ID there *before their assistant is built* and their receptionist
uses that voice. Leave it blank to use the default warm female voice.

> Tip: for a business, warm + clear + not-too-fast beats "characterful." Pick 2–3 and ring
> the demo line to hear them on a real phone before deciding — phone audio sounds different
> to the browser preview.

---

## 2. Make the website widget book & capture leads

The ElevenLabs agent on the demo page (`agent_2401kw1mdpm2eg6b6rhhb55785ch`) can chat, but
to make it **do things** (save a lead, check the calendar, book) you add **Server Tools** to
it in the ElevenLabs dashboard. Each tool is a webhook pointing at your live backend.

> You can only do this once the backend is deployed — the URLs below use your Render URL.
> Replace `https://YOUR-RENDER-URL` with the real one.

ElevenLabs → **Conversational AI → your agent → Tools → Add tool → Webhook**. Add these three:

### Tool 1 — `log_lead`
- **Description:** *Save the caller's details as a lead and text the business owner. Call this once you have at least a name and phone number.*
- **Method:** `POST`
- **URL:** `https://YOUR-RENDER-URL/log-lead`
- **Body parameters** (type: string, value provided by the LLM):
  - `name` — Caller's name
  - `phone` — Caller's phone number
  - `reason` — What they need
  - `urgency` — "normal" or "urgent"
  - `preferred_time` — Any time/day they prefer

### Tool 2 — `check_availability`
- **Description:** *Check the calendar. Pass date (YYYY-MM-DD) and time if the caller named one, to check that slot; otherwise call with nothing to get the next open slots.*
- **Method:** `POST`
- **URL:** `https://YOUR-RENDER-URL/availability`
- **Body parameters:**
  - `date` — Requested date, YYYY-MM-DD (optional)
  - `time` — Requested time, e.g. "10:00" or "2:30pm" (optional)

### Tool 3 — `book_appointment`
- **Description:** *Book a slot returned by check_availability. Use the slot's id as startISO. Reads back a booking reference.*
- **Method:** `POST`
- **URL:** `https://YOUR-RENDER-URL/book`
- **Body parameters:**
  - `startISO` — The chosen slot's id from check_availability
  - `name` — Caller's name
  - `phone` — Caller's phone
  - `reason` — What the appointment is for

*(Optional extras, same pattern: `cancel-booking` and `reschedule-booking` — see the URLs in
`BACKEND-GO-LIVE.md`.)*

Then in the agent's **System prompt**, add a line like:
> "When someone wants to book, use check_availability then book_appointment, and read back the
> reference. Always capture a name and phone with log_lead before ending."

Save. Now a chat on the website widget captures leads into the same CRM inbox and books into
the same calendar as the phone line — one brain, two front doors.

---

### Which agent should clients use — Vapi or the ElevenLabs widget?

- **Phone calls → Vapi assistant** (this is the product you sell; it has all the tools already).
- **Website chat/voice widget → the ElevenLabs agent** (nice-to-have on a client's site).

They can share the same backend (`/log-lead`, `/availability`, `/book`), so leads and bookings
from both land in the one CRM.
