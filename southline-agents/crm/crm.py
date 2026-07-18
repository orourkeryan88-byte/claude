#!/usr/bin/env python3
"""Southline CRM — a tiny file-based CRM.

Stages: lead -> contacted -> replied -> booked -> client -> lost

Usage:
  crm.py list [stage]
  crm.py add "Business Name" --type "cosmetic clinic" --town Cork \
         --email x@y.ie --phone "+353..." [--stage lead]
  crm.py show "Business Name"
  crm.py stage "Business Name" booked
  crm.py note "Business Name" "spoke on phone, session Monday"
  crm.py log-call "Business Name" --caller "+353.." --summary "asked prices"
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "clients.json"
STAGES = ["lead", "contacted", "replied", "booked", "client", "lost"]


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def load() -> dict:
    if DB_PATH.exists():
        return json.loads(DB_PATH.read_text())
    return {"clients": []}


def save(db: dict) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DB_PATH.write_text(json.dumps(db, indent=2, ensure_ascii=False) + "\n")


def find(db: dict, name: str) -> dict | None:
    name_l = name.lower()
    for c in db["clients"]:
        if c["name"].lower() == name_l:
            return c
    # fall back to substring match
    matches = [c for c in db["clients"] if name_l in c["name"].lower()]
    return matches[0] if len(matches) == 1 else None


def cmd_list(args) -> None:
    db = load()
    rows = db["clients"]
    if args.stage:
        rows = [c for c in rows if c["stage"] == args.stage]
    if not rows:
        print("No clients found.")
        return
    width = max(len(c["name"]) for c in rows) + 2
    for c in rows:
        print(f"{c['name']:<{width}} {c['stage']:<10} {c.get('town',''):<10} "
              f"{c.get('email','')}")


def cmd_add(args) -> None:
    db = load()
    if find(db, args.name):
        sys.exit(f"'{args.name}' already exists.")
    db["clients"].append({
        "name": args.name,
        "type": args.type or "",
        "town": args.town or "",
        "email": args.email or "",
        "phone": args.phone or "",
        "contact": args.contact or "",
        "stage": args.stage,
        "created": now(),
        "notes": [],
        "calls": [],
        "bookings": [],
    })
    save(db)
    print(f"Added '{args.name}' as {args.stage}.")


def cmd_show(args) -> None:
    db = load()
    c = find(db, args.name)
    if not c:
        sys.exit(f"'{args.name}' not found.")
    print(json.dumps(c, indent=2, ensure_ascii=False))


def cmd_stage(args) -> None:
    if args.new_stage not in STAGES:
        sys.exit(f"Stage must be one of: {', '.join(STAGES)}")
    db = load()
    c = find(db, args.name)
    if not c:
        sys.exit(f"'{args.name}' not found.")
    old = c["stage"]
    c["stage"] = args.new_stage
    c["notes"].append({"when": now(), "text": f"stage: {old} -> {args.new_stage}"})
    save(db)
    print(f"{c['name']}: {old} -> {args.new_stage}")


def cmd_note(args) -> None:
    db = load()
    c = find(db, args.name)
    if not c:
        sys.exit(f"'{args.name}' not found.")
    c["notes"].append({"when": now(), "text": args.text})
    save(db)
    print("Noted.")


def cmd_log_call(args) -> None:
    db = load()
    c = find(db, args.name)
    if not c:
        sys.exit(f"'{args.name}' not found.")
    c["calls"].append({
        "when": now(),
        "caller": args.caller or "",
        "duration_s": args.duration or 0,
        "summary": args.summary or "",
    })
    save(db)
    print("Call logged.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("list")
    sp.add_argument("stage", nargs="?", choices=STAGES)
    sp.set_defaults(fn=cmd_list)

    sp = sub.add_parser("add")
    sp.add_argument("name")
    sp.add_argument("--type")
    sp.add_argument("--town")
    sp.add_argument("--email")
    sp.add_argument("--phone")
    sp.add_argument("--contact")
    sp.add_argument("--stage", default="lead", choices=STAGES)
    sp.set_defaults(fn=cmd_add)

    sp = sub.add_parser("show")
    sp.add_argument("name")
    sp.set_defaults(fn=cmd_show)

    sp = sub.add_parser("stage")
    sp.add_argument("name")
    sp.add_argument("new_stage")
    sp.set_defaults(fn=cmd_stage)

    sp = sub.add_parser("note")
    sp.add_argument("name")
    sp.add_argument("text")
    sp.set_defaults(fn=cmd_note)

    sp = sub.add_parser("log-call")
    sp.add_argument("name")
    sp.add_argument("--caller")
    sp.add_argument("--duration", type=int)
    sp.add_argument("--summary")
    sp.set_defaults(fn=cmd_log_call)

    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
