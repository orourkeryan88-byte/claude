# GHL Transfer Pack — everything portable, in your hands

This folder is your complete kit to move the AI receptionist to GoHighLevel.
Remember: your CODE can't be uploaded to GHL — GHL replaces it with its own
features. What moves is the CONTENT, SETTINGS and DATA below.

## What's in here
1. **1-voice-ai-prompt.txt** — your receptionist's full brain (persona, booking
   logic, spam screening). Paste into a GHL Voice AI agent.
2. **2-business-settings.md** — hours, pricing, calendar rules, pipeline stages
   and the workflows to rebuild. Type these into GHL.
3. **3-contacts-import-template.csv** — the CSV header GHL expects. Fill with your
   clients/leads and import into GHL Contacts.
4. **4-export-from-external-services.md** — step-by-step to pull your real data
   OUT of Stripe, Vapi, Twilio and Google Calendar (I can't reach those — you do
   it from each dashboard).

## The honest summary of what "transfers"
| Item | Lives in | How it moves to GHL |
|---|---|---|
| Receptionist persona/logic | This pack (file 1) | Paste into Voice AI |
| Hours / pricing / calendar rules | This pack (file 2) | Retype in GHL |
| Paying clients | **Stripe** | Export CSV → import |
| Manual client logins | **Render env** (CLIENT_ACCOUNTS) | Copy → import |
| Call recordings/transcripts | **Vapi** | Download to keep |
| Phone numbers | **Twilio** | Port, or re-forward |
| Bookings | **Google Calendar** | Connect same account |
| The code | **GitHub** | Stays as backup/reference |

## Do this in order
1. Read file 4, export from Stripe + copy CLIENT_ACCOUNTS from Render.
2. Merge those into one CSV using file 3's header.
3. Set up GHL, connect your Stripe + Twilio keys.
4. Build ONE template sub-account using files 1 & 2, save it as a Snapshot.
5. Import contacts, create a sub-account per client from the Snapshot.
6. Move phone numbers last (port or re-forward).
