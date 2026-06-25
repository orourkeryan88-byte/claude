# Southline AI Receptionist — the built product

This is the assembled, deployable AI receptionist. The **in-call workflow** (`../workflow/`) is the backbone; this folder turns it into a runnable Vapi assistant.

## What it is

A Vapi assistant whose brain follows the workflow **greet → identify → understand → (qualify) → act → confirm → close**, with five tools wired in:

| Tool | Does |
|---|---|
| `check_availability` | Reads real open slots from Google Calendar |
| `book_appointment` | Books a slot into Google Calendar |
| `submit_booking` | Emits the booking payload to your booking workflow → returns a reference |
| `log_lead` | Saves leads / messages / complaints + texts the owner |
| `transferCall` | Puts the caller through to a human (emergencies, "speak to someone") |

Model: **claude-opus-4-8** · Voice: ElevenLabs · Transcriber: Deepgram.

## Build it

```bash
node ai-receptionist/build.js                 # builds the demo clinic
node ai-receptionist/build.js my-client.json  # builds for a real client
```

Output: `ai-receptionist/<business>.assistant.json` — a complete config with no placeholders left. A pre-built demo is included: `southline-demo-clinic.assistant.json`.

A client profile is just:

```json
{
  "businessName": "Bright Smile Dental",
  "businessType": "dental clinic",
  "area": "Ballsbridge, Dublin",
  "openingHours": "Mon-Fri 9-6, Sat 9-1",
  "services": "check-ups, cleanings, whitening, Invisalign",
  "pricingNotes": "Check-up & clean 65 euro. New patients welcome.",
  "faq": "On Merrion Rd, parking on site. Card/cash/insurers accepted.",
  "ownerPhone": "+3538xxxxxxx",
  "webhookBase": "https://your-app.onrender.com",
  "bookingWorkflowUrl": "https://your-booking-workflow/webhook"
}
```

## Deploy it

1. **Build** the assistant (above).
2. In Vapi: **Assistants → Create → JSON →** paste the file.
3. Make sure your webhook server (`../server/`) is deployed and `webhookBase` points at it (for `log_lead`, `check_availability`, `book_appointment`).
4. Point `bookingWorkflowUrl` at your booking workflow.
5. **Buy a number** in Vapi and assign it to the assistant. (See `../PHONE-SETUP.md`.)
6. Call it. It greets, identifies, qualifies, books, transfers, and hands off — exactly per the workflow.

## How the pieces fit

```
                ┌─────────────────────────────┐
 Caller ──call──▶  AI Receptionist (this)      │  ← workflow is the backbone
                │  greet→identify→qualify→act   │
                └──────┬───────────────┬────────┘
        submit_booking │               │ log_lead / end-of-call
                       ▼               ▼
            Your BOOKING workflow   Post-call automation (../automation)
            (booking_reference)     CRM · owner SMS · calendar · follow-up
```

The workflow, prompts and connection contracts live in `../workflow/`. Change the workflow there and rebuild — the assistant stays in sync.
