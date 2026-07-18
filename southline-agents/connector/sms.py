#!/usr/bin/env python3
"""Booking-confirmation SMS via Twilio.

When the receptionist books an appointment, the customer instantly gets
a text confirming it (and the clinic owner can get one too).

Setup — add to southline-agents/config.json:

  "twilio": {
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "auth_token":  "your-auth-token",
    "from": "+353xxxxxxxxx",        <- your Twilio number, or an
                                       alphanumeric ID like "CorkCosmet"
    "notify_owner": true            <- also text the clinic owner
  }

Where to find SID/token: Twilio Console home page (twilio.com/console),
"Account Info" box. NOTE: on a TRIAL account Twilio only delivers SMS
to numbers you've verified under Phone Numbers > Verified Caller IDs.
Upgrade the account to text real customers.

No Twilio config? Messages are written to output/<client>/sms-outbox/
so nothing is lost and you can see exactly what would have been sent.
"""
import base64
import json
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUTPUT = BASE / "output"
CONFIG = BASE / "config.json"

CUSTOMER_TMPL = ("{name}: your {what} is booked for {slot}. "
                 "Need to change it? Ring {phone}. See you then!")
OWNER_TMPL = ("New booking: {customer} - {what} - {slot} "
              "(booked by your phone assistant)")


def _cfg() -> dict:
    try:
        return json.loads(CONFIG.read_text()).get("twilio") or {}
    except Exception:
        return {}


def _send_twilio(cfg: dict, to: str, body: str) -> bool:
    url = (f"https://api.twilio.com/2010-04-01/Accounts/"
           f"{cfg['account_sid']}/Messages.json")
    data = urllib.parse.urlencode(
        {"To": to, "From": cfg["from"], "Body": body}).encode()
    auth = base64.b64encode(
        f"{cfg['account_sid']}:{cfg['auth_token']}".encode()).decode()
    req = urllib.request.Request(
        url, data=data, headers={"Authorization": f"Basic {auth}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return 200 <= r.status < 300
    except Exception as e:
        print(f"[sms] Twilio send failed: {e}")
        return False


def _outbox(client: dict, to: str, body: str) -> None:
    outdir = (OUTPUT / client["name"].lower().replace(" ", "-")
              / "sms-outbox")
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    (outdir / f"{stamp}.txt").write_text(f"To: {to}\n\n{body}\n")


def booking_confirmation(client: dict, payload: dict) -> None:
    """Called by the connector on every /webhook/booking."""
    phone = client.get("phone") or "the clinic"
    slot = payload.get("when", "your appointment time")
    what = payload.get("what", "appointment")
    customer = payload.get("customer_name") or "there"
    to_customer = payload.get("caller")

    cfg = _cfg()
    configured = bool(cfg.get("account_sid") and cfg.get("auth_token")
                      and cfg.get("from"))

    # 1. Confirmation to the customer
    if to_customer:
        body = CUSTOMER_TMPL.format(name=client["name"], what=what,
                                    slot=slot, phone=phone)
        sent = configured and _send_twilio(cfg, to_customer, body)
        if not sent:
            _outbox(client, to_customer, body)
        print(f"[sms] customer confirmation -> {to_customer}"
              f" ({'sent' if sent else 'outbox only - Twilio not configured'})")

    # 2. Heads-up to the clinic owner (optional)
    owner_phone = client.get("phone")
    if cfg.get("notify_owner") and owner_phone:
        body = OWNER_TMPL.format(customer=customer, what=what, slot=slot)
        sent = configured and _send_twilio(cfg, owner_phone, body)
        if not sent:
            _outbox(client, owner_phone, body)
        print(f"[sms] owner heads-up -> {owner_phone}"
              f" ({'sent' if sent else 'outbox only'})")
