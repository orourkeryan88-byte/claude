#!/usr/bin/env python3
"""Audit agent — turns your findings into the polished "free one-page
audit" you promise in outreach emails.

You answer a handful of y/n questions on the command line, it writes the
client-facing audit document.

Usage:
  audit.py "Cork Cosmetic Clinic"                  # interactive
  audit.py "Cork Cosmetic Clinic" --answers nnnyny  # non-interactive:
      one y/n per question, in order (7 questions). Lets other agents
      and scripts run audits without a keyboard.
"""
import sys
from datetime import date
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "crm"))
import crm  # noqa: E402

OUTPUT = BASE / "output"

CHECKS = [
    ("page1",    "Are they on page 1 of Google for their main service?",
     "You're invisible for '{svc} {town}' searches - competitors take "
     "those customers by default.",
     "You already rank - we protect and extend that position."),
    ("gbp",      "Is their Google Business Profile complete (hours/photos/services)?",
     "An incomplete Google profile costs trust AND ranking. It's the "
     "first thing people see on Maps.",
     "Profile is complete - next lever is reviews."),
    ("reviews",  "Do they have as many recent Google reviews as top competitors?",
     "Competitors with hundreds of reviews win the click even when you "
     "rank. A simple ask-every-customer flow fixes this in months.",
     "Review base is healthy - keep the flow running."),
    ("booking",  "Is there an obvious Book/Call button on their site?",
     "People ready to book can't find the button - that's paid-for "
     "visitors walking away.",
     "Booking path is clear."),
    ("mobile",   "Is the site fast and mobile friendly?",
     "Most local searches happen on a phone. A slow mobile site loses "
     "the visitor before it loads.",
     "Mobile experience is fine."),
    ("email",    "Do they use a branded email (not gmail/yahoo)?",
     "A personal email address on a medical/professional business reads "
     "as unestablished. A branded address is a cheap credibility win.",
     "Branded email in place."),
    ("ads",      "Are they running any Google/Meta ads?",
     "Competitors are paying to sit above you. Even a small, tightly "
     "targeted budget captures ready-to-buy searches.",
     "Ads running - review targeting and tracking."),
]


def ask(q: str) -> bool:
    while True:
        a = input(f"{q} [y/n] ").strip().lower()
        if a in ("y", "yes"):
            return True
        if a in ("n", "no"):
            return False


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit('Usage: audit.py "Business Name" [--answers ynnyyny]')
    name = sys.argv[1]

    answers = None
    if "--answers" in sys.argv:
        raw = sys.argv[sys.argv.index("--answers") + 1].lower()
        if len(raw) != len(CHECKS) or set(raw) - {"y", "n"}:
            sys.exit(f"--answers needs exactly {len(CHECKS)} y/n letters "
                     f"(one per question), e.g. --answers nnnyyny")
        answers = [ch == "y" for ch in raw]

    db = crm.load()
    c = crm.find(db, name) or {"name": name, "type": "business", "town": ""}

    svc = c.get("type", "business")
    town = c.get("town", "your area")

    if answers is None:
        print(f"\nAnswer for {c['name']} (check Google/their site first):\n")
    problems, fine = [], []
    for i, (key, q, bad, good) in enumerate(CHECKS):
        ok = answers[i] if answers is not None else ask(q)
        (fine if ok else problems).append(
            (q, (good if ok else bad).format(svc=svc, town=town)))

    lines = [
        f"MARKETING AUDIT - {c['name']}",
        f"Prepared by Southline | {date.today().isoformat()}",
        "=" * 52, "",
        f"I looked at how {c['name']} shows up online, the way a new "
        f"customer in {town} would. Here's what I found.",
        "",
        f"WHAT'S COSTING YOU CUSTOMERS ({len(problems)} issues)",
        "-" * 52,
    ]
    for i, (q, txt) in enumerate(problems, 1):
        lines += [f"{i}. {txt}", ""]
    if fine:
        lines += ["WHAT'S ALREADY WORKING", "-" * 52]
        for q, txt in fine:
            lines += [f"+ {txt}"]
        lines.append("")
    lines += [
        "WHERE I'D START",
        "-" * 52,
        "The top " + str(min(3, len(problems))) + " issues above are "
        "quick wins - typically sorted inside the first month.",
        "",
        "Want them fixed? Ring Ryan on 085 174 0783 or just reply to "
        "this email.",
    ]

    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / f"audit-{c['name'].lower().replace(' ', '-')}.txt"
    path.write_text("\n".join(lines) + "\n")
    print(f"\nWritten: {path}")


if __name__ == "__main__":
    main()
