#!/usr/bin/env python3
"""Client notifications — tells the business (e.g. Cork Cosmetic Clinic)
what each caller needed, the moment the receptionist finishes the call.

Two modes:
  1. Always: writes a ready-to-forward message to
     output/<client>/notifications/  (never lost, works with no setup).
  2. If SMTP is configured, ALSO emails it to the client automatically.

To enable auto-email, add to southline-agents/config.json:
  "smtp": {
    "host": "smtp.gmail.com", "port": 587,
    "user": "agencysouthline@gmail.com",
    "app_password": "xxxx xxxx xxxx xxxx"   <- Gmail App Password, NOT
  }                                            your normal password
(Google Account > Security > 2-Step Verification > App passwords.)
"""
import json
import smtplib
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUTPUT = BASE / "output"
CONFIG = BASE / "config.json"

CALL_TMPL = """\
Subject: New call for {name} — {need}

Hi {contact},

Your phone assistant just took a call.

  Caller:      {caller}
  When:        {when}
  What they need:
  >> {need}

{action}
— Sent automatically by your Southline receptionist
"""

BOOKING_TMPL = """\
Subject: New booking for {name} — {what}, {slot}

Hi {contact},

Your phone assistant just BOOKED an appointment:

  Customer:    {customer}
  Phone:       {caller}
  Appointment: {what}
  Time:        {slot}

It should already be in your calendar/booking system — this is just so
you know without checking.

— Sent automatically by your Southline receptionist
"""

MESSAGE_TMPL = """\
Subject: Message for {name} — caller wants a callback

Hi {contact},

A caller left this message with your phone assistant:

  Caller:  {caller}
  When:    {when}
  Message:
  >> {message}

ACTION NEEDED: this one is waiting on a callback from you.

— Sent automatically by your Southline receptionist
"""


def _action_line(payload: dict) -> str:
    outcome = (payload.get("outcome") or "").lower()
    if outcome in ("callback", "message", "unresolved"):
        return "ACTION NEEDED: they're expecting a callback from you.\n"
    if outcome == "booked":
        return "No action needed - the assistant booked them in.\n"
    return ("No action needed unless you'd like to follow up - the "
            "assistant handled it.\n")


def build_message(client: dict, kind: str, payload: dict) -> str:
    contact = client.get("contact") or client["name"]
    when = datetime.now().strftime("%a %d %b, %H:%M")
    caller = payload.get("caller", "unknown number")
    if kind == "call":
        return CALL_TMPL.format(
            name=client["name"], contact=contact, caller=caller, when=when,
            need=payload.get("summary", "no summary provided"),
            action=_action_line(payload))
    if kind == "booking":
        return BOOKING_TMPL.format(
            name=client["name"], contact=contact, caller=caller,
            customer=payload.get("customer_name", "not given"),
            what=payload.get("what", "appointment"),
            slot=payload.get("when", "see booking system"))
    return MESSAGE_TMPL.format(
        name=client["name"], contact=contact, caller=caller, when=when,
        message=payload.get("message", ""))


def _try_email(client: dict, text: str) -> bool:
    """Send via SMTP if configured AND the client has an email. Returns
    True on success."""
    try:
        cfg = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
        smtp = cfg.get("smtp") or {}
        to_addr = client.get("email")
        if not (smtp.get("host") and smtp.get("user")
                and smtp.get("app_password") and to_addr):
            return False
        subject, _, body = text.partition("\n\n")
        msg = EmailMessage()
        msg["Subject"] = subject.removeprefix("Subject: ")
        msg["From"] = smtp["user"]
        msg["To"] = to_addr
        msg.set_content(body)
        with smtplib.SMTP(smtp["host"], int(smtp.get("port", 587))) as s:
            s.starttls()
            s.login(smtp["user"], smtp["app_password"])
            s.send_message(msg)
        return True
    except Exception as e:  # never let notification kill the webhook
        print(f"[notify] email failed: {e}")
        return False


def client_notification(client: dict, kind: str, payload: dict) -> None:
    text = build_message(client, kind, payload)

    outdir = OUTPUT / client["name"].lower().replace(" ", "-") / "notifications"
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = outdir / f"{stamp}-{kind}.txt"
    path.write_text(text)

    sent = _try_email(client, text)
    print(f"[notify] {kind} -> {path.name}"
          f"{' + emailed to ' + client.get('email', '') if sent else ' (email not configured - file only)'}")
