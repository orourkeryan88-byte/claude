#!/usr/bin/env python3
"""Southline self-test — checks every system end to end.

Run:  python3 test_all.py

Creates a throwaway client, exercises all 8 systems against it, prints
PASS/FAIL for each, then removes every trace of the test data. Safe to
run any time — it never touches your real clients.
"""
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data" / "clients.json"
OUT = BASE / "output"
TEST = "ZZTEST Healthcheck"
SLUG = "zztest-healthcheck"
PORT = "8095"

results = []


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=BASE, capture_output=True, text=True, **kw)


def check(name, ok, detail=""):
    results.append((name, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail and not ok else ""))


def post(path, payload):
    req = urllib.request.Request(
        f"http://localhost:{PORT}{path}",
        data=json.dumps(payload).encode(), method="POST")
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read())


def main():
    print("Southline systems self-test\n" + "=" * 40)

    # 1. CRM
    r = run(["python3", "crm/crm.py", "add", TEST, "--type", "test",
             "--town", "Cork", "--email", "zz@test.ie"])
    r2 = run(["python3", "crm/crm.py", "stage", TEST, "contacted"])
    r3 = run(["python3", "crm/crm.py", "list"])
    check("1. CRM (add/stage/list)",
          r.returncode == 0 and r2.returncode == 0 and TEST in r3.stdout,
          r.stderr or r2.stderr)

    # 2. Onboarding
    r = run(["python3", "agents/onboarding.py", TEST,
             "--price", "1", "--service", "selftest"])
    files = {p.name for p in (OUT / SLUG).glob("*")} if (OUT / SLUG).exists() else set()
    check("2. Onboarding agent",
          r.returncode == 0 and {"welcome-email.txt", "intake-questions.txt",
                                 "audit-checklist.txt"} <= files, r.stderr)

    # 3. Invoice (BIC derivation)
    r = run(["python3", "agents/invoice.py", TEST, "--amount", "1",
             "--service", "selftest", "--iban", "IE29AIBK93115212345678"])
    check("3. Invoice agent (IBAN->BIC)",
          r.returncode == 0 and "AIBKIE2D" in r.stdout, r.stderr)

    # 4. Audit (non-interactive)
    r = run(["python3", "agents/audit.py", TEST, "--answers", "nnnyyny"])
    check("4. Audit agent", r.returncode == 0
          and (OUT / f"audit-{SLUG}.txt").exists(), r.stderr)

    # 5. Outreach
    csv = BASE / "output" / "zztest-leads.csv"
    csv.parent.mkdir(exist_ok=True)
    csv.write_text("Business,Town,Type,Email Address,Status\n"
                   "ZZTest Barber,Cork,barber,zz@demo.ie,\n")
    r = run(["python3", "agents/outreach.py", str(csv)])
    check("5. Outreach agent", r.returncode == 0
          and (OUT / "outreach" / "zztest-barber.txt").exists(), r.stderr)

    # 6. Reviews
    r = run(["python3", "agents/reviews.py", TEST])
    check("6. Review agent", r.returncode == 0
          and (OUT / SLUG / "review-request-email.txt").exists(), r.stderr)

    # 7. Report
    r = run(["python3", "agents/reports.py", TEST])
    check("7. Report agent", r.returncode == 0
          and any((OUT / SLUG).glob("report-*.txt")), r.stderr)

    # 8. Connector (webhooks -> CRM + notifications)
    proc = subprocess.Popen(["python3", "connector/server.py"], cwd=BASE,
                            env={"PORT": PORT, "DEFAULT_CLIENT": TEST,
                                 "PATH": "/usr/bin:/bin"},
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.0)
        ok_call = post("/webhook/call", {"client": TEST, "caller": "+353860000000",
                                         "summary": "selftest", "outcome": "handled"})
        ok_book = post("/webhook/booking", {"client": TEST, "when": "Mon 10:00",
                                            "what": "selftest", "caller": "+353860000000"})
        db = json.loads(DATA.read_text())
        c = next(x for x in db["clients"] if x["name"] == TEST)
        notif = (OUT / SLUG / "notifications")
        check("8. Receptionist connector",
              ok_call.get("status") == "ok" and ok_book.get("status") == "ok"
              and len(c.get("calls", [])) >= 1 and len(c.get("bookings", [])) >= 1
              and notif.exists() and len(list(notif.glob("*.txt"))) >= 2)
    except Exception as e:
        check("8. Receptionist connector", False, str(e))
    finally:
        proc.terminate()

    # ---- cleanup: remove every trace of the test client ----
    db = json.loads(DATA.read_text())
    db["clients"] = [c for c in db["clients"] if c["name"] != TEST]
    DATA.write_text(json.dumps(db, indent=2, ensure_ascii=False))
    shutil.rmtree(OUT / SLUG, ignore_errors=True)
    for p in [OUT / f"audit-{SLUG}.txt", OUT / "zztest-leads.csv",
              OUT / "outreach" / "zztest-barber.txt",
              OUT / f"invoice-{SLUG}.txt"]:
        p.unlink(missing_ok=True)
    for p in OUT.glob(f"**/*{SLUG}*"):
        p.unlink(missing_ok=True)

    print("=" * 40)
    passed = sum(1 for _, ok in results if ok)
    print(f"{passed}/{len(results)} systems passing"
          + ("  — ALL GOOD ✔" if passed == len(results) else "  — see FAILs above"))
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
