#!/usr/bin/env python3
"""Onboarding agent — one command turns a booked lead into a client.

Generates into output/<client>/:
  1. welcome-email.txt      - ready-to-send welcome + what happens next
  2. intake-questions.txt   - what you need from them before work starts
  3. audit-checklist.txt    - your session audit, pre-filled from the CRM
  4. invoice-....txt        - via the invoice agent (if IBAN configured)
and moves the client to stage "client" in the CRM.

Usage:
  onboarding.py "Cork Cosmetic Clinic" --price 350 \
      --service "AI Receptionist setup + first month"
"""
import argparse
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "agents"))
sys.path.insert(0, str(BASE / "crm"))

import crm                      # noqa: E402
import invoice as invoice_mod   # noqa: E402

OUTPUT = BASE / "output"


WELCOME = """\
Subject: Welcome aboard, {contact_or_name} — here's what happens next

Hi {contact}',

Great to have {name} on board — looking forward to getting started.

Here's what happens next:

1. TODAY - I'll send a short list of things I need from you (logins,
   a few photos, your price list). Five minutes of your time, tops.
2. THIS WEEK - I get to work on the first fixes we agreed:
{deliverables}
3. EVERY MONTH - you get a one-page report in plain English: what I did,
   what it produced, what's next. No jargon.

The invoice for {service} (EUR {price:.0f}) is attached - payment is by
bank transfer, details on the invoice.

Any questions at all, just ring me on {my_phone}.

Talk soon,
Ryan
Southline
{my_phone} | {my_email}
"""

INTAKE = """\
INTAKE — what I need from {name} to start work
================================================

ACCESS (most important)
[ ] Google Business Profile - add me as a manager
    (Google Maps profile > menu > Business Profile settings > People)
[ ] Website login (or tell me who built it and I'll deal with them)
[ ] Facebook / Instagram page - add me as an editor
[ ] Booking system login ({booking_hint})

BUSINESS BASICS
[ ] Exact list of services + prices (photo of your price list is fine)
[ ] Opening hours, including any days you're closed
[ ] 5-10 good photos (the premises, treatments, before/afters you have
    consent to use)
[ ] Anything you do NOT want mentioned in marketing

GOALS
[ ] Which service makes you the most money?
[ ] Which service do you want more of?
[ ] Rough monthly budget for ads (EUR 0 is a fine answer to start)
"""

AUDIT = """\
CLIENT AUDIT — {name}
=====================================
Contact:   {contact} | {phone} | {email}
Address:   {address}
Services:  {services}

GOOGLE SEARCH
[ ] Page-1 ranking for "{type} {town}"?          Finding: ____
[ ] Who outranks them?                            Finding: ____
[ ] Competitors running ads?                      Finding: ____

GOOGLE BUSINESS PROFILE
[ ] Claimed, hours/photos/services complete?      Finding: ____
[ ] Review count + recency vs competitors?        Finding: ____
[ ] Replying to reviews?                          Finding: ____

WEBSITE
[ ] Loads under 3s (PageSpeed Insights)?          Finding: ____
[ ] Mobile friendly?                              Finding: ____
[ ] Clear Book/Call button above the fold?        Finding: ____
[ ] Booking system surfaced on the site?          Finding: ____

BRAND & TRUST
[ ] Branded email address (not gmail/yahoo)?      Finding: ____
[ ] Consistent name/phone across listings?        Finding: ____

TOP 3 QUICK WINS
1. ____
2. ____
3. ____
"""


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("client")
    p.add_argument("--price", type=float, required=True)
    p.add_argument("--service", required=True)
    p.add_argument("--deliverables", default=
                   "   - Google Business Profile sorted and optimised\n"
                   "   - Booking button made obvious on your website\n"
                   "   - Branded email set up")
    args = p.parse_args()

    db = crm.load()
    c = crm.find(db, args.client)
    if not c:
        sys.exit(f"'{args.client}' not in CRM. Add it first: "
                 f"crm.py add \"{args.client}\" ...")

    cfg = invoice_mod.load_config()
    my_phone = cfg.get("phone", "085 174 0783")
    my_email = cfg.get("email", "agencysouthline@gmail.com")
    contact = c.get("contact") or "there"

    outdir = OUTPUT / c["name"].lower().replace(" ", "-")
    outdir.mkdir(parents=True, exist_ok=True)

    (outdir / "welcome-email.txt").write_text(WELCOME.format(
        contact_or_name=c.get("contact") or c["name"], contact=contact,
        name=c["name"], service=args.service, price=args.price,
        deliverables=args.deliverables, my_phone=my_phone,
        my_email=my_email))

    booking_hint = "e.g. Fresha" if "fresha" not in json.dumps(c).lower() \
        else "Fresha"
    (outdir / "intake-questions.txt").write_text(INTAKE.format(
        name=c["name"], booking_hint=booking_hint))

    (outdir / "audit-checklist.txt").write_text(AUDIT.format(
        name=c["name"], contact=contact, phone=c.get("phone", ""),
        email=c.get("email", ""), address=c.get("address", ""),
        services=c.get("services", ""), type=c.get("type", "business"),
        town=c.get("town", "")))

    # Invoice — only if an IBAN is configured.
    iban = cfg.get("iban")
    if iban:
        text = invoice_mod.build_invoice(
            c["name"], args.price, args.service, iban,
            bill_to=c.get("address", ""))
        (outdir / "invoice.txt").write_text(text)
        invoice_note = "invoice.txt"
    else:
        invoice_note = ("SKIPPED invoice - no IBAN in config.json. "
                        "Add it, then run agents/invoice.py")

    if c["stage"] != "client":
        old = c["stage"]
        c["stage"] = "client"
        c["notes"].append({"when": crm.now(),
                           "text": f"onboarded (stage {old} -> client)"})
        crm.save(db)

    print(f"Onboarding pack for {c['name']} -> {outdir}/")
    for f in ["welcome-email.txt", "intake-questions.txt",
              "audit-checklist.txt"]:
        print(f"  - {f}")
    print(f"  - {invoice_note}")
    print(f"CRM stage: client")


if __name__ == "__main__":
    main()
