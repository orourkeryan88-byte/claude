# Connecting your AI phone receptionist to the CRM

The connector (`server.py`) is provider-agnostic: anything that can POST
JSON when a call ends can feed the CRM.

## What you need to do (I can't do these for you)

1. **Pick a voice-AI provider and create the account** — Vapi (vapi.ai),
   Retell (retellai.com) or Twilio. This is where the actual "AI answering
   the phone" lives.
2. **Buy/port a phone number** inside that provider (a few EUR/month).
3. **Host this connector somewhere public** — simplest options:
   - a EUR 5/month VPS, or
   - free tier on Render/Railway (`python3 connector/server.py`, port from
     `PORT` env var — already supported).
4. Paste your public URL into the provider's webhook field (below).

## Per-provider setup

### Vapi
Assistant → Advanced → **Server URL** → `https://YOUR-HOST/webhook/call`.
Vapi sends an `end-of-call-report`; map its fields in a small transform or
use a Vapi "tool call" that POSTs:
`{"caller": "{{customer.number}}", "summary": "{{summary}}", "duration_s": {{durationSeconds}}}`

For bookings, give the assistant a **function/tool** named `book_appointment`
whose server URL is `https://YOUR-HOST/webhook/booking`.

### Retell
Agent → **Webhook URL** → `https://YOUR-HOST/webhook/call` (fires on
`call_ended` / `call_analyzed` events).

### Twilio Studio
Add an **HTTP Request widget** at the end of the flow, method POST,
URL `https://YOUR-HOST/webhook/call`, body:
`{"caller": "{{trigger.call.From}}", "summary": "{{widgets.gather.SpeechResult}}"}`

## Test it locally right now (no provider needed)

```bash
python3 connector/server.py &
curl -X POST localhost:8080/webhook/call \
  -d '{"caller":"+353861112222","duration_s":60,"summary":"asked prices"}'
curl -X POST localhost:8080/webhook/booking \
  -d '{"when":"2026-07-24 14:00","what":"lip filler consult","customer_name":"Aoife"}'
python3 crm/crm.py show "Cork Cosmetic Clinic"   # both events now on the record
```

## Security note

Before going public, put a shared secret in front of it (e.g. require a
`?key=...` query param or an `Authorization` header) — one-line change in
`server.py`'s `do_POST`. Ask Claude to add it when you have a host.
