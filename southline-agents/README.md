# Southline Agents

Automation agents for Southline (Ryan O'Rourke) — a digital marketing agency
serving Irish local businesses. Everything runs with plain Python 3 (no
external packages needed).

## The agents

| # | Agent | File | What it does |
|---|-------|------|--------------|
| 1 | **CRM** | `crm/crm.py` | File-based client/lead database. Add leads, move them through stages (lead → contacted → replied → booked → client), log calls and notes. |
| 2 | **Onboarding agent** | `agents/onboarding.py` | One command turns a lead into a client: generates the welcome email, intake questionnaire, audit checklist and the invoice (with automatic IBAN → BIC lookup for Irish banks). |
| 3 | **Invoice agent** | `agents/invoice.py` | Standalone invoice generator. Give it an IBAN and it derives the BIC itself. |
| 4 | **Audit agent** | `agents/audit.py` | Generates the "free one-page audit" you offer in your outreach emails, from a filled-in checklist. |
| 5 | **Outreach agent** | `agents/outreach.py` | Reads a CSV of leads (same format as your YAMM sheets) and produces personalised outreach emails + follow-up sequence, and marks them in the CRM. |
| 6 | **Review agent** | `agents/reviews.py` | Post-appointment review-request emails/SMS for your clients' customers (builds Google reviews). |
| 7 | **Report agent** | `agents/reports.py` | Monthly client report from CRM activity — what you did, calls captured, next steps. |
| 8 | **Receptionist ↔ CRM connector** | `connector/server.py` | A webhook server. Point your AI phone receptionist (Vapi / Retell / Twilio) at it and every call, booking and voicemail is logged into the CRM automatically. |

## Quick start

```bash
# 1. See your pipeline
python3 crm/crm.py list

# 2. Onboard Cork Cosmetic Clinic (already seeded as a lead)
python3 agents/onboarding.py "Cork Cosmetic Clinic" --price 350 --service "AI Receptionist setup + first month"

# 3. Start the receptionist connector (CRM <-> phone system)
python3 connector/server.py          # listens on :8080
```

Generated documents land in `output/`.

## Connecting a real phone receptionist

`connector/server.py` accepts POSTs on:

- `POST /webhook/call`     — call ended (caller, duration, transcript summary)
- `POST /webhook/booking`  — appointment booked by the receptionist
- `POST /webhook/message`  — voicemail / message taken

Vapi, Retell and Twilio Studio can all POST JSON to a URL when a call ends —
paste your server's public URL into their "webhook / server URL" field.
See `connector/README.md` for the exact payload shape and per-provider notes.

## What this does NOT do (needs a human)

- Create Vapi/Retell/Twilio accounts or buy a phone number — you must sign up.
- Send email by itself — it writes ready-to-send drafts; you send them (keeps
  you in control and out of spam trouble).
- Take payments — invoices are bank-transfer based (IBAN/BIC on the invoice).
