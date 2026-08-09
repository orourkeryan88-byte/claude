# AI Receptionist on GoHighLevel — Start to Finish

Follow top to bottom. No code. Goal: a phone number that your AI receptionist
answers, books, and logs — then a way to repeat it per client.

Do everything inside ONE sub-account first (that's one client's workspace).

---

## STAGE 0 — Account (once)
1. Log into your GHL **agency** dashboard.
2. **Accounts → Create Sub-Account** → name it (e.g. "Joe's Plumbing").
3. Open that sub-account (you'll do the rest inside it).

## STAGE 1 — Turn on the phone system (once per account)
4. **Settings → Phone Numbers.**
5. If prompted, complete **LC Phone** setup (adds billing for calls/texts).
6. Start **A2P / phone compliance registration** now (Settings → Phone Numbers →
   Trust Center / A2P). ⚠ This can take 1–2 days to approve and SMS won't send
   until it is — so kick it off first, then carry on with the steps below.

## STAGE 2 — Buy the number
7. **Settings → Phone Numbers → Add Number.**
8. Search by country / area code, pick one, **Buy** (a couple $/month).
   Leave it for now — you'll connect it in Stage 4.

## STAGE 3 — Build the receptionist (Voice AI agent)
9. **AI Agents → Voice AI → Create Agent.** Name it "Reception".
10. **First message** (what it says when it answers):
    "Hi, thanks for calling [Business], you're through to reception. How can I help?"
11. **Instructions / prompt:** paste your receptionist prompt
    (from `ghl-transfer-pack/1-voice-ai-prompt.txt`). Fill in the business name,
    hours, services, pricing, FAQ.
12. **Actions the agent can use:** enable **Book appointment** (calendar) and
    **Transfer call** (to the owner's mobile).

## STAGE 4 — 🔗 Connect the number to the receptionist
13. **Settings → Phone Numbers →** click the number you bought.
14. Find **Inbound Call Handling** (or "Call Settings").
15. Set it to **Voice AI →** choose your **"Reception"** agent.
16. **Save.** ✅ Calls to that number are now answered by the receptionist.

## STAGE 5 — Calendar (so it can book)
17. **Calendars → Create Calendar.** Set hours (e.g. Mon–Fri 9:00–17:30),
    slot length 30 mins.
18. **Connect Google Calendar** (Calendars → Connections) so bookings sync.
19. Back in the Voice AI agent, make sure its **Book appointment** action points
    at THIS calendar.

## STAGE 6 — Capture the caller's details (data extraction)
20. **Settings → Custom Fields → Add Field:** create **Job/Reason**,
    **Urgency** (dropdown: Normal/Urgent), **Preferred time**.
    (Name + Phone are already standard fields.)
21. In the **Voice AI agent → Data Collection**, add a field for each and map it:
    - Caller's first name → Name
    - Best callback number → Phone
    - What they need / the job → Job/Reason
    - Urgent? (leak, no heat, emergency) → Urgency
    - Any preferred day/time → Preferred time
22. Save. Every call now auto-fills these on the contact, with recording +
    transcript + summary attached automatically.

## STAGE 7 — Text the owner + log to pipeline
23. **Automation → Workflows → Create Workflow.**
24. **Trigger:** Call Completed (or Contact Created).
25. **Action — Send SMS** to the owner:
    `New lead — {{contact.first_name}} · {{contact.phone}} · {{contact.job_reason}} · {{contact.urgency}}`
26. **Action — Create/Update Opportunity →** pipeline stage "New Lead".
27. **Save & Publish.**

## STAGE 8 — Test it (before any client)
28. Ring the number yourself like a customer. Give a name, a job, say "it's urgent".
29. Check: it answered, booked you, the **owner got the text**, and the contact
    shows name/phone/job/urgency + the recording. Fix the prompt if anything's off.

## STAGE 9 — Go live for the client
30. Give the client their Vapi/GHL number and set their phone to **forward when
    unanswered:** dial `**61*<the number>#` and press call.
    (Busy: `**67*<number>#` · Unreachable: `**62*<number>#` · All calls: `**21*<number>#`.)
    Their own number stays the same — it just forwards to the receptionist.

## STAGE 10 — Repeat per client (fast)
31. Once this sub-account is perfect: **Agency → Snapshots → Create Snapshot** from it.
32. New client = new sub-account → **load the snapshot** → buy their number →
    connect it (Stage 4) → tweak business details → forward their phone. Minutes each.

---

### The order that matters most
A2P registration (Stage 1.6) FIRST because it's the slow bit → buy number →
build agent → **connect number to agent (Stage 4)** → calendar → capture fields →
owner text → test. Miss the connect step and the phone rings with nobody home.
