# System 2 — Onboarding: The Moment They Say YES

```
SALES INTAKE FORM → CONTRACT SIGNED → ONBOARDING FORM → CALENDAR BOOKED
   → REMINDERS SENT → ONBOARDING CALL + PRESENTATION
```

**The job of this system:** eliminate buyer's remorse. The 48 hours after someone signs is when doubt creeps in — he's told his wife he's spending €2,000 a month with a lad he met on Instagram. Every hour of silence in that window is an hour for that decision to rot.

**The principle:** momentum. Something lands in his inbox within 60 seconds of saying yes, and something else lands every time he completes a step. He should never be waiting on you.

Every step below is triggered by the previous step completing. No human touches it until the onboarding call.

---

## The trigger chain

| # | Step | Fires when | Sends | Automated |
|---|---|---|---|---|
| 1 | Sales Intake Form | He says yes on the call | — | Manual (you fill it in live) |
| 2 | Contract | Intake form submitted | Contract to his inbox | 100% |
| 3 | Onboarding Form | Contract signed | Discovery questionnaire | 100% |
| 4 | Onboarding Calendar | Onboarding form submitted | Calendar link | 100% |
| 5 | Reminders | Call booked | 24hr / 1hr / 5min | 100% |
| 6 | Onboarding Call | Reminder ladder completes | Presentation | Manual (you run it) |

**Do not let him leave the sales call before step 1 is done.** Fill the intake form in while you're still on Zoom with him. "Give me 90 seconds, I'll get this started now so the contract's with you before you've made a cup of tea." That sentence alone kills most buyer's remorse.

---

## Step 1 — Sales Intake Form (you fill this in, on the call)

Commercial details only. Keep it to 90 seconds.

- Legal business name (as registered) + trading name
- Company registration number
- VAT number and VAT status
- Billing contact: name, email, mobile
- Billing address
- Signatory name + email *(the person who legally signs — often the same, sometimes a spouse or accountant)*
- Package selected
- Management fee agreed
- Setup fee agreed
- Ad spend budget per month
- Agreed start date
- Territory granted *(the exclusivity area — write it down now or you'll argue about it later)*
- Anything promised on the call that isn't standard *(critical: this is what you get held to)*

**Trigger on submit → generate and send the contract.**

---

## Step 2 — Contract (100% automated)

Auto-populated from the intake form and delivered to the signatory's inbox within 60 seconds.

**Email that carries it:**

**Subject:** Welcome aboard {{Company}} — contract attached

> {{FirstName}},
>
> Grand — that's us started. Contract's below, takes about two minutes to sign on your phone.
>
> It's four pages and there's nothing hidden in it. The short version: {{FEE}} a month, {{AD_SPEND}} of ad spend paid directly by you to Meta and Google, 90 days to start and then rolling monthly on 30 days' notice. You own every account and every bit of creative, always.
>
> Sign here: {{CONTRACT_LINK}}
>
> The second you sign, you'll get one form from me. Fill that in and we're moving.
>
> Ryan

**Restate the commercial terms in the email body.** He signs on a phone and won't read the PDF. Terms he's seen in plain English can't be a nasty surprise in month two.

**Trigger on signature → send the onboarding form.**

---

## Step 3 — Onboarding Form (100% automated)

This is the discovery questionnaire — the full version already lives at `onboarding/templates/02-client-intake-questionnaire.md`. Send that, cut to the sections that matter for a trade firm.

**The email:**

**Subject:** Signed — here's the only homework you'll get

> That's signed, {{FirstName}}, thanks.
>
> One form and it's the only one you'll get from me. About 15 minutes: {{FORM_LINK}}
>
> Two questions on it matter more than all the rest, so give them a minute each:
>
> - **Paste 3–5 real reviews or things customers have said to you, word for word.** Don't tidy them up. Your ads get written out of these, not out of my imagination.
> - **What number would make this obviously worth it in 90 days?** Be specific — "six extra surveys a month" beats "more leads."
>
> And when you get a chance, WhatsApp me 20 photos off your phone. Before-and-afters, jobs in progress, your crew working, the van. Doesn't matter if they're rough. Rough is what performs.
>
> Ryan

**The photo ask goes here, not later.** It's the single biggest predictor of how the account performs, and he's at peak willingness right now.

**Trigger on submit → send the onboarding calendar link.**

---

## Step 4 — Onboarding Calendar (100% automated)

**Subject:** Last step — pick a time and we'll get going

> Form's in, {{FirstName}}, that's everything I need.
>
> Last thing: grab 45 minutes whenever suits — {{CALENDAR_LINK}}
>
> On that call I'll show you the actual plan: the ads we're running, what the page looks like, what happens when someone enquires, and what you'll see from me every week.
>
> If you can, be at a laptop rather than the van — there's a fair bit to look at.
>
> Ryan

**Trigger on booking → start the reminder ladder.**

---

## Step 5 — Reminders (100% automated)

Same ladder as System 4, different tone — he's a client now, not a prospect.

- **24hr SMS:** "Onboarding call tomorrow at {{Time}}, {{FirstName}}. Bring the photos if you haven't sent them yet."
- **1hr SMS:** "One hour — {{ZOOM_LINK}}"
- **5min SMS:** "Starting now, {{ZOOM_LINK}}. Laptop if you can."

---

## Step 6 — Onboarding Call + Presentation (45 minutes, you run it)

Use a template deck, same every time. The consistency is what makes it feel like an operation rather than a lad with a laptop.

| Minutes | Section |
|---|---|
| 0–5 | Welcome. Introduce anyone else on your side by name and role. |
| 5–12 | **Play his business back to him** from the onboarding form. Proves you read it. |
| 12–20 | The plan: campaigns, creative angles, the landing page, the offer. |
| 20–28 | **What happens when a lead comes in** — and the five-minute rule. Get him to agree out loud that someone will ring within five minutes. This is the commitment that decides whether the account works. |
| 28–35 | The 90-day roadmap and the milestone at each month. Reset expectations: weeks 1–2 build, 3–6 learning, 7–12 optimisation. |
| 35–40 | How you work: weekly written update on a fixed day, monthly call, response times, escalation path to you personally. |
| 40–45 | What you need from him: approvals in 2 days, photos monthly, honest numbers. Then the immediate next steps with dates. |

**Send the recap within 2 hours**, while it's fresh: what was agreed, the target number, the start date, and his three commitments in writing.

---

## Behind-the-scenes automation

These fire silently alongside the client-facing steps. He never sees them; they're what stops things falling through cracks.

| Automation | Fires on | What it does |
|---|---|---|
| Add to CRM / database | Contract signed | Creates the client record with all intake fields |
| Update deal stage | Each step | Sold → Contracted → Onboarding → Active |
| Create project workspace | Contract signed | Folder, shared drive, Slack or WhatsApp channel |
| Create task list | Contract signed | The full 14-day launch checklist, assigned with due dates |
| Notify the team | Contract signed | "New client: {{Company}}, {{Package}}, starts {{Date}}" |
| Access request email | Onboarding form submitted | Sends the platform access checklist |
| Diarise reviews | Onboarding call booked | Day 30 review, day 60 testimonial ask, day 75 renewal conversation |
| Start the clock | Onboarding call complete | 14-day launch countdown begins |

---

## The stack

**Option A — all in one (recommended if you're starting today)**
GoHighLevel. Forms, contracts with e-sign, calendar, SMS, email, pipeline and automations in one place, around $97–$297/month. One tool, one place things break.

**Option B — modular (cheaper, more control, more to maintain)**

| Job | Tool |
|---|---|
| Forms | Tally (free) or Typeform |
| Contracts + e-sign | PandaDoc, Docusign, or SignWell |
| Calendar | Cal.com (free) or Calendly |
| SMS | Twilio, or ClickSend for Irish numbers |
| Email | Instantly, Lemlist, or plain Gmail + Make |
| Glue | Make.com — the piece that connects everything |
| Database | Notion or Airtable |

**Build order — do not build all of it at once.** Steps 2 and 3 first: contract auto-sends on intake, onboarding form auto-sends on signature. That's 80% of the remorse problem solved in an afternoon. Add the calendar and reminders after your second client. Add the behind-the-scenes automations after your third, when you actually know what falls through.

---

## Why this matters more than it looks

| What it does | Why it pays |
|---|---|
| Elite client experience | No scrambling, no "can we start next week?" chaos. Polished and predictable from day one. |
| Increases lifetime value | First impressions set retention. Better onboarding, longer accounts, more revenue per client. |
| Massive time savings | Hours of manual admin per client, gone. You spend the time on delivery instead. |
| Sets proper expectations | The structured process prevents the misaligned expectations that cause month-three arguments. |
| Builds your conviction | Professional infrastructure makes you charge more and apologise less. |
| Eliminates buyer's remorse | Immediate action after the sale keeps momentum high and reinforces his decision while it's still fragile. |

**The bottom line:** this system turns the most fragile moment in the whole business — the hour after someone says yes — into the moment they become most certain they were right.
