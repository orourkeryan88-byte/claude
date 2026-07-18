#!/usr/bin/env python3
"""Report agent — builds the plain-English monthly client report from CRM
activity (calls captured by the receptionist, bookings, notes).

Usage:
  reports.py "Cork Cosmetic Clinic"
"""
import sys
from datetime import date
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "crm"))
import crm  # noqa: E402

OUTPUT = BASE / "output"


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit('Usage: reports.py "Business Name"')
    db = crm.load()
    c = crm.find(db, sys.argv[1])
    if not c:
        sys.exit(f"'{sys.argv[1]}' not in CRM.")

    calls = c.get("calls", [])
    bookings = c.get("bookings", [])
    notes = [n for n in c.get("notes", [])
             if not n["text"].startswith("stage:")]

    lines = [
        f"MONTHLY REPORT — {c['name']}",
        f"From Southline | {date.today().strftime('%B %Y')}",
        "=" * 52, "",
        "THE NUMBERS",
        f"  Calls handled:        {len(calls)}",
        f"  Appointments booked:  {len(bookings)}",
        "",
    ]
    if calls:
        lines.append("CALLS")
        for k in calls[-15:]:
            lines.append(f"  {k['when']}  {k.get('caller','')}  "
                         f"{k.get('summary','')}")
        lines.append("")
    if bookings:
        lines.append("BOOKINGS")
        for b in bookings[-15:]:
            lines.append(f"  {b.get('when','')}  {b.get('what','')}  "
                         f"({b.get('customer_name','') or b.get('caller','')})")
        lines.append("")
    if notes:
        lines.append("WORK DONE / NOTES")
        for n in notes[-10:]:
            lines.append(f"  {n['when']}  {n['text']}")
        lines.append("")
    lines += [
        "NEXT MONTH",
        "  [fill in 2-3 bullets before sending]",
        "",
        "Questions? Ring Ryan on 085 174 0783.",
    ]

    outdir = OUTPUT / c["name"].lower().replace(" ", "-")
    outdir.mkdir(parents=True, exist_ok=True)
    path = outdir / f"report-{date.today().strftime('%Y-%m')}.txt"
    path.write_text("\n".join(lines) + "\n")
    print(f"Written: {path}")


if __name__ == "__main__":
    main()
