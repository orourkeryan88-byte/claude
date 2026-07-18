#!/usr/bin/env python3
"""Outreach agent — personalised cold-email drafts from a CSV of leads
(same columns as your YAMM sheets), plus a follow-up sequence, and logs
every lead into the CRM as 'contacted'.

CSV columns (header row required, extras ignored):
  Business,Type,Location,Email Address

Usage:
  outreach.py leads.csv                 # write drafts to output/outreach/
  outreach.py leads.csv --followup 1    # first follow-up instead
"""
import argparse
import csv
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "crm"))
import crm  # noqa: E402

OUTPUT = BASE / "output" / "outreach"

FIRST = """\
To: {email}
Subject: quick one {business} — could you handle 50 more customers?

Hey,

What if I told you I could get you 50 more customers — people in
{location} already searching for a {type}... would that benefit
{business}, or would it be more hassle than it's worth?

I had a look at how you show up online. You've clearly built something
good — but when I searched for a {type} around {location}, you weren't
the first name that came up. The ones above you aren't better than you.
They're just easier to find right now.

That's what I fix: top of Google, smart targeted ads, and everything
tracked to real enquiries and bookings — not clicks and likes. No long
contracts, no jargon.

My offer: a free one-page breakdown of exactly where customers are
slipping past {business} and the first things I'd fix. Costs nothing,
and even if we never talk again you'll know what to sort.

Want me to send it over?

Cheers,
Ryan
Southline
085 174 0783

Not for you? Reply "no thanks" and I'll leave you be.
"""

FOLLOWUPS = [
    """\
To: {email}
Subject: Re: quick one {business}

Hey — just floating this back up. That free breakdown for {business} is
still on the table; takes you zero effort, I do the digging.

Worth a look? One word reply does it.

Ryan, Southline — 085 174 0783
""",
    """\
To: {email}
Subject: last one from me, {business}

Hey — I'll keep this the shortest email you get today.

I put together audits for a couple of other {type}s in {location} this
month and every one had the same 2-3 leaks losing them customers.
If you'd like yours before I move on: just reply "yes".

Either way, best of luck with {business}.

Ryan, Southline — 085 174 0783
""",
]


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("csvfile")
    p.add_argument("--followup", type=int, default=0,
                   help="0 = first email, 1/2 = follow-up number")
    args = p.parse_args()

    rows = list(csv.DictReader(open(args.csvfile, newline="")))
    if not rows:
        sys.exit("CSV is empty.")

    template = FIRST if args.followup == 0 else FOLLOWUPS[args.followup - 1]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    db = crm.load()
    written = 0

    for r in rows:
        biz = (r.get("Business") or "").strip()
        email = (r.get("Email Address") or r.get("Email") or "").strip()
        if not biz or not email:
            continue
        text = template.format(
            business=biz, email=email,
            type=(r.get("Type") or "business").strip().lower(),
            location=(r.get("Location") or r.get("Town") or "your area").strip())
        fname = f"{'fu%d-' % args.followup if args.followup else ''}" \
                f"{biz.lower().replace(' ', '-')}.txt"
        (OUTPUT / fname).write_text(text)
        written += 1

        if not crm.find(db, biz):
            db["clients"].append({
                "name": biz, "type": r.get("Type", ""),
                "town": r.get("Location") or r.get("Town", ""),
                "email": email, "phone": "", "contact": "",
                "stage": "contacted", "created": crm.now(),
                "notes": [{"when": crm.now(),
                           "text": "outreach draft generated"}],
                "calls": [], "bookings": [],
            })

    crm.save(db)
    print(f"{written} drafts written to {OUTPUT}/ and leads logged in CRM.")
    print("Review each one, then send from your own Gmail (YAMM or "
          "manually). Sending stays in YOUR hands - that keeps deliverability "
          "and consent your call.")


if __name__ == "__main__":
    main()
