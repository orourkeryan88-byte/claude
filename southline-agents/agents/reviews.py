#!/usr/bin/env python3
"""Review agent — generates the post-appointment review-request messages
you set up for each client (one of your core deliverables: growing their
Google reviews).

Usage:
  reviews.py "Cork Cosmetic Clinic" --review-link "https://g.page/r/XXXX/review"
"""
import argparse
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "crm"))
import crm  # noqa: E402

OUTPUT = BASE / "output"

EMAIL = """\
Subject: How did we do, {{first_name}}?

Hi {{first_name}},

Thanks for visiting {name} — hope you're delighted with the result.

If you have 30 seconds, a quick Google review makes a huge difference
to a small clinic like ours:

{link}

Thanks a million,
{contact}
{name}
"""

SMS = """\
Hi {{first_name}}, thanks for visiting {name} today! If you have 30
seconds, we'd really appreciate a quick Google review: {link} — {contact}
"""

USAGE_NOTE = """\
HOW TO USE (give this to the client)
====================================
1. Send the SMS the same evening as the appointment (best response rate),
   or the email next morning.
2. Replace {{first_name}} with the customer's name.
3. Never offer discounts for reviews (against Google's rules).
4. Reply to every review that comes in - two sentences is plenty.

Where to find the review link: Google Business Profile > "Ask for
reviews" - it gives you the short g.page link.
"""


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("client")
    p.add_argument("--review-link", default="[PASTE GOOGLE REVIEW LINK]")
    args = p.parse_args()

    db = crm.load()
    c = crm.find(db, args.client)
    if not c:
        sys.exit(f"'{args.client}' not in CRM.")

    outdir = OUTPUT / c["name"].lower().replace(" ", "-")
    outdir.mkdir(parents=True, exist_ok=True)
    contact = c.get("contact") or c["name"]

    (outdir / "review-request-email.txt").write_text(
        EMAIL.format(name=c["name"], link=args.review_link, contact=contact))
    (outdir / "review-request-sms.txt").write_text(
        SMS.format(name=c["name"], link=args.review_link, contact=contact))
    (outdir / "review-request-howto.txt").write_text(USAGE_NOTE)

    print(f"Review pack written to {outdir}/ (email, SMS, how-to).")


if __name__ == "__main__":
    main()
