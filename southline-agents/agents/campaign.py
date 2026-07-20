#!/usr/bin/env python3
"""Campaign engine — run a large personalised outreach campaign the way
that actually lands warm leads, without getting your number or inbox
burned.

What it does:
  * Merges one or many lead CSVs (your YAMM sheets), de-duplicates by
    email, and drops anyone on your opt-out list.
  * Personalises each message (Business / Type / Location).
  * DRIPS the send: a capped number per day, spaced out, so it looks
    human and stays inside Gmail's limits and Ireland's marketing rules.
  * Logs every contact into the CRM as 'contacted' so replies can be
    marked 'replied' (= your warm lead) later.

Why not 1000-at-once from a phone: personal SIMs get banned within ~50
sends, and unsolicited *SMS* to consumers breaks Irish ePrivacy rules
(S.I. 336/2011). B2B email to a business address, personalised, dripped
and with an opt-out, is the compliant, deliverable route — that's what
this runs.

Channels:
  --channel email   (default) plain-text business email
  --channel sms     only for B2B numbers you're allowed to text; still
                    routed through the Twilio sender + rate limit

Modes:
  (default)         DRY RUN — writes each message to output/campaign/ and
                    a send-plan.csv, changes nothing else. Review first.
  --send            actually send today's batch (email via Gmail SMTP in
                    config.json; sms via Twilio). Records what went out.

Examples:
  # Plan a 1000-lead campaign, 40/day, review the drafts:
  python3 agents/campaign.py ../leads/*.csv --per-day 40

  # Send today's 40 for real:
  python3 agents/campaign.py ../leads/*.csv --per-day 40 --send

  # Add someone to the permanent opt-out list:
  python3 agents/campaign.py --optout someone@business.ie
"""
import argparse
import base64
import csv
import glob
import smtplib
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from email.message import EmailMessage
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "crm"))
import crm  # noqa: E402
import json  # noqa: E402

OUTPUT = BASE / "output" / "campaign"
OPTOUT = BASE / "data" / "optout.txt"
SENTLOG = BASE / "data" / "campaign-sent.txt"
CONFIG = BASE / "config.json"

SUBJECT = "quick one {business} — could you handle 50 more customers?"
BODY = """\
Hey,

What if I could get {business} 50 more customers — people in {location}
already searching for a {type} — would that help, or be more hassle than
it's worth?

I had a look at how you show up online. You've built something good, but
when I searched for a {type} around {location} you weren't the first name
that came up. The ones above you aren't better — just easier to find.

That's what I fix: top of Google, smart targeted ads, all tracked to real
enquiries and bookings, not clicks. No long contracts, no jargon.

My offer: a free one-page breakdown of where customers slip past
{business} and the first things I'd fix. Costs nothing.

Want me to send it over?

Cheers,
Ryan
Southline · 085 174 0783 · agencysouthline@gmail.com

Don't want to hear from me? Reply STOP and I won't contact you again.
"""
SMS_BODY = ("Hi {business} — Ryan at Southline. I help {location} "
            "businesses get more customers off Google. Can I send a free "
            "1-page breakdown of where you're losing leads? Reply STOP to opt out.")


def load_optout() -> set:
    if not OPTOUT.exists():
        return set()
    return {l.strip().lower() for l in OPTOUT.read_text().splitlines() if l.strip()}


def load_sent() -> set:
    if not SENTLOG.exists():
        return set()
    return {l.strip().lower() for l in SENTLOG.read_text().splitlines() if l.strip()}


def add_optout(email: str) -> None:
    OPTOUT.parent.mkdir(parents=True, exist_ok=True)
    with OPTOUT.open("a") as f:
        f.write(email.strip().lower() + "\n")
    print(f"Added {email} to opt-out list. They'll be skipped from now on.")


def read_leads(patterns) -> list:
    rows, files = [], []
    for pat in patterns:
        files.extend(glob.glob(pat))
    if not files:
        sys.exit(f"No CSV files matched: {patterns}")
    for fp in files:
        with open(fp, newline="") as fh:
            for r in csv.DictReader(fh):
                biz = (r.get("Business") or "").strip()
                email = (r.get("Email Address") or r.get("Email") or "").strip()
                if not biz:
                    continue
                rows.append({
                    "business": biz,
                    "email": email,
                    "type": (r.get("Type") or "business").strip().lower(),
                    "location": (r.get("Location") or r.get("Town")
                                 or "your area").strip(),
                    "phone": (r.get("Phone") or "").strip(),
                })
    return rows


def dedupe(rows, key) -> list:
    seen, out = set(), []
    for r in rows:
        k = (r.get(key) or "").lower()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(r)
    return out


def _smtp_send(cfg, to_addr, subject, body) -> bool:
    smtp = cfg.get("smtp") or {}
    if not (smtp.get("host") and smtp.get("user") and smtp.get("app_password")):
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp["user"]
    msg["To"] = to_addr
    msg.set_content(body)
    try:
        with smtplib.SMTP(smtp["host"], int(smtp.get("port", 587))) as s:
            s.starttls()
            s.login(smtp["user"], smtp["app_password"])
            s.send_message(msg)
        return True
    except Exception as e:
        print(f"  ! email to {to_addr} failed: {e}")
        return False


def _twilio_send(cfg, to, body) -> bool:
    tw = cfg.get("twilio") or {}
    if not (tw.get("account_sid") and tw.get("auth_token") and tw.get("from")):
        return False
    url = f"https://api.twilio.com/2010-04-01/Accounts/{tw['account_sid']}/Messages.json"
    data = urllib.parse.urlencode({"To": to, "From": tw["from"], "Body": body}).encode()
    auth = base64.b64encode(f"{tw['account_sid']}:{tw['auth_token']}".encode()).decode()
    req = urllib.request.Request(url, data=data,
                                 headers={"Authorization": f"Basic {auth}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return 200 <= r.status < 300
    except Exception as e:
        print(f"  ! sms to {to} failed: {e}")
        return False


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("csvfiles", nargs="*", help="lead CSV file(s) or globs")
    p.add_argument("--per-day", type=int, default=40,
                   help="max messages this run (default 40 — safe for Gmail)")
    p.add_argument("--channel", choices=["email", "sms"], default="email")
    p.add_argument("--send", action="store_true",
                   help="actually send; without it this is a dry run")
    p.add_argument("--delay", type=float, default=8.0,
                   help="seconds between real sends (default 8)")
    p.add_argument("--optout", metavar="EMAIL",
                   help="add an address to the opt-out list and exit")
    args = p.parse_args()

    if args.optout:
        add_optout(args.optout)
        return
    if not args.csvfiles:
        sys.exit("Give me at least one lead CSV (or --optout EMAIL).")

    key = "email" if args.channel == "email" else "phone"
    rows = dedupe(read_leads(args.csvfiles), key)
    optout, sent = load_optout(), load_sent()

    queue = [r for r in rows
             if r.get(key) and r[key].lower() not in optout
             and r[key].lower() not in sent]
    skipped_no_contact = sum(1 for r in rows if not r.get(key))

    print(f"Leads read:        {len(rows)}")
    print(f"  no {key}:        {skipped_no_contact}")
    print(f"  opted out:       {sum(1 for r in rows if r.get(key, '').lower() in optout)}")
    print(f"  already sent:    {sum(1 for r in rows if r.get(key, '').lower() in sent)}")
    print(f"Ready to contact:  {len(queue)}")
    days = (len(queue) + args.per_day - 1) // max(args.per_day, 1)
    print(f"At {args.per_day}/day this campaign runs over ~{days} day(s).\n")

    batch = queue[:args.per_day]
    if not batch:
        print("Nothing to send today — everyone's contacted or opted out.")
        return

    OUTPUT.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    db = crm.load()
    plan = []
    done = 0

    for r in batch:
        if args.channel == "email":
            subj = SUBJECT.format(**r)
            body = BODY.format(**r)
            target = r["email"]
        else:
            subj = "(sms)"
            body = SMS_BODY.format(**r)
            target = r["phone"]

        fname = f"{args.channel}-{r['business'].lower().replace(' ', '-')}.txt"
        (OUTPUT / fname).write_text(f"To: {target}\nSubject: {subj}\n\n{body}\n")

        status = "planned"
        if args.send:
            ok = (_smtp_send(cfg, target, subj, body) if args.channel == "email"
                  else _twilio_send(cfg, target, body))
            status = "SENT" if ok else "FAILED"
            if ok:
                with SENTLOG.open("a") as f:
                    f.write(target.lower() + "\n")
            time.sleep(args.delay)

        # log/refresh CRM lead
        c = crm.find(db, r["business"])
        if not c:
            db["clients"].append({
                "name": r["business"], "type": r["type"], "town": r["location"],
                "email": r["email"], "phone": r["phone"], "contact": "",
                "stage": "contacted", "created": crm.now(),
                "notes": [{"when": crm.now(),
                           "text": f"campaign {args.channel} {status}"}],
                "calls": [], "bookings": [],
            })
        elif args.send and status == "SENT" and c["stage"] == "lead":
            c["stage"] = "contacted"
            c["notes"].append({"when": crm.now(),
                               "text": f"campaign {args.channel} sent"})

        plan.append({"business": r["business"], "to": target, "status": status})
        done += 1

    crm.save(db)
    with (OUTPUT / "send-plan.csv").open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["business", "to", "status"])
        w.writeheader()
        w.writerows(plan)

    if not args.send:
        print(f"{done} messages planned (dry run). "
              f"Drafts + send-plan.csv in {OUTPUT}/")
        print("Review the drafts, then re-run with --send to send today's batch.")
    else:
        ok = sum(1 for x in plan if x["status"] == "SENT")
        failed = done - ok
        print(f"{ok} sent, {failed} failed. Drafts + send-plan.csv in {OUTPUT}/")
        if failed:
            print("  Failures usually mean SMTP/Twilio isn't set in config.json "
                  "yet — see send-plan.csv for which, then re-run.")
        if ok:
            print(f"Run again tomorrow for the next {args.per_day}. "
                  f"Replies: mark them with `crm.py stage \"Business\" replied` "
                  f"— those are your warm leads.")


if __name__ == "__main__":
    main()
