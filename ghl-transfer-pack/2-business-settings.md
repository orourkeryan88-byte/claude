# Business & Calendar Settings (rebuild these in GHL)

These are the live values from your app config (`render.yaml` / `.env`). Type
them into the matching GHL screens when you build your template sub-account.

## Pricing (your offer to clients)
- Setup fee: **€350** one-off
- Monthly: **€150/month**
- (GHL SaaS Mode: set these as your plan price and connect your Stripe.)

## Calendar / booking rules
| Setting | Value | Where in GHL |
|---|---|---|
| Timezone | Europe/Dublin | Calendar settings |
| Open hour | 09:00 | Availability |
| Close hour | 17:30 | Availability |
| Slot length | 30 mins | Slot duration |
| Open days | Mon–Fri | Availability |
| Optional lunch break | 13:00–14:00 (if used) | Blocked hours |
| Optional buffer | 15 mins around appts (if used) | Buffer time |
| Google Calendar | 2-way sync | Calendar > Connections |

## Pipeline stages (for the CRM / Opportunities board)
1. New Lead
2. Contacted
3. Booked / Appointment set
4. Job done
5. (Optional) Follow-up / Review request

## Lead SMS to owner (recreate as a GHL Workflow)
Trigger: contact created by the Voice AI (or "Customer Replied"/inbound call).
Action: send SMS to the owner. Message template:

    NEW LEAD — {{business_name}}
    Name: {{contact.first_name}}
    Phone: {{contact.phone}}
    Job: {{reason}}
    When: {{preferred_time}}
    {{urgent_flag}}

## Automations to rebuild as GHL Workflows (these replace your n8n flows)
- Missed-call text-back (use GHL's built-in "Missed Call Text Back" recipe)
- Lead notification to owner (SMS, above)
- Appointment reminder (24h + 2h before)
- Daily summary to owner (Workflow on a schedule)
- Spam/sales call tagging (tag contact "SALES CALL", no owner alert)

## Per-client custom values to set on each sub-account
BUSINESS_NAME, BUSINESS_TYPE, AREA, OPENING_HOURS, SERVICES, PRICING_NOTES,
FAQ, LANGUAGES, OWNER_PHONE (where leads are texted).
