#!/usr/bin/env python3
"""Invoice agent — generates a bank-transfer invoice and derives the BIC
from the IBAN automatically (Irish + common EU banks).

Usage:
  invoice.py "Cork Cosmetic Clinic" --amount 350 \
      --service "AI Receptionist setup" --iban "IE29AIBK93115212345678"

Your IBAN can also live in southline-agents/config.json:
  {"business_name": "Southline", "iban": "IE...", "phone": "085 174 0783",
   "email": "agencysouthline@gmail.com"}
"""
import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

DEFAULT_ACCOUNT_NAME = "Ryan O'Rourke"
BASE = Path(__file__).resolve().parent.parent
CONFIG = BASE / "config.json"
OUTPUT = BASE / "output"

# Bank code (IBAN chars 5-8) -> BIC. Irish banks + banks Irish sole traders
# commonly use. The bank code fixes the BIC, so this lookup is exact.
BIC_MAP = {
    "AIBK": "AIBKIE2D",   # AIB
    "BOFI": "BOFIIE2D",   # Bank of Ireland
    "IPBS": "IPBSIE2D",   # Permanent TSB
    "ULSB": "ULSBIE2D",   # Ulster Bank
    "REVO": "REVOIE23",   # Revolut (IE IBANs)
    "KODA": "KODAIE21",   # KBC Ireland (legacy)
    "BARC": "BARCIE2D",   # Barclays IE
    "CITI": "CITIIE2X",   # Citibank IE
    "NTSB": "NTSBDEB1",   # N26 (German IBAN)
    "BUNQ": "BUNQNL2A",   # bunq (Dutch IBAN)
}


def bic_from_iban(iban: str) -> str | None:
    iban = iban.replace(" ", "").upper()
    if len(iban) < 8:
        return None
    bank_code = iban[4:8]
    return BIC_MAP.get(bank_code)


def validate_iban(iban: str) -> bool:
    """Standard mod-97 IBAN check."""
    s = iban.replace(" ", "").upper()
    if len(s) < 15 or not s[:2].isalpha() or not s[2:4].isdigit():
        return False
    rearranged = s[4:] + s[:4]
    digits = "".join(str(int(ch, 36)) for ch in rearranged)
    return int(digits) % 97 == 1


def load_config() -> dict:
    if CONFIG.exists():
        return json.loads(CONFIG.read_text())
    return {}


def next_invoice_number() -> str:
    counter = OUTPUT / ".invoice_counter"
    n = int(counter.read_text()) + 1 if counter.exists() else 1
    OUTPUT.mkdir(parents=True, exist_ok=True)
    counter.write_text(str(n))
    return f"SL-{date.today().year}-{n:03d}"


def build_invoice(client_name: str, amount: float, service: str,
                  iban: str, bill_to: str = "") -> str:
    cfg = load_config()
    bic = bic_from_iban(iban)
    iban_clean = iban.replace(" ", "").upper()
    iban_pretty = " ".join(iban_clean[i:i + 4] for i in range(0, len(iban_clean), 4))
    number = next_invoice_number()
    today = date.today()
    due = today + timedelta(days=7)

    warnings = []
    if not validate_iban(iban):
        warnings.append("!! IBAN failed checksum validation - double-check it.")
    if not bic:
        warnings.append("!! Unknown bank code - look up the BIC on your "
                        "banking app and fill it in.")

    lines = [
        "=" * 56,
        f"  INVOICE {number}",
        "=" * 56,
        f"  From:    {cfg.get('business_name', 'Southline')} "
        f"(Ryan O'Rourke, sole trader)",
        f"           {cfg.get('phone', '085 174 0783')} | "
        f"{cfg.get('email', 'agencysouthline@gmail.com')}",
        "",
        f"  Bill to: {client_name}",
    ]
    if bill_to:
        lines.append(f"           {bill_to}")
    lines += [
        "",
        f"  Date:    {today.isoformat()}     Due: {due.isoformat()} (7 days)",
        "-" * 56,
        f"  {service:<42} EUR {amount:>8.2f}",
        "-" * 56,
        f"  {'TOTAL DUE':<42} EUR {amount:>8.2f}",
        "",
        "  Payment by bank transfer:",
        f"    Account name: {cfg.get('account_name', DEFAULT_ACCOUNT_NAME)}",
        f"    IBAN: {iban_pretty}",
        f"    BIC:  {bic or '[FILL IN - see warning]'}",
        f"    Reference: {number}",
        "=" * 56,
    ]
    for w in warnings:
        lines.append(f"  {w}")
    return "\n".join(lines) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("client")
    p.add_argument("--amount", type=float, required=True)
    p.add_argument("--service", required=True)
    p.add_argument("--iban", help="defaults to config.json iban")
    p.add_argument("--bill-to", default="", help="client address line")
    args = p.parse_args()

    iban = args.iban or load_config().get("iban")
    if not iban:
        sys.exit("No IBAN given. Pass --iban or set it in config.json.")

    text = build_invoice(args.client, args.amount, args.service, iban,
                         args.bill_to)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    safe = args.client.lower().replace(" ", "-")
    path = OUTPUT / f"invoice-{safe}.txt"
    path.write_text(text)
    print(text)
    print(f"Saved to {path}")


if __name__ == "__main__":
    main()
