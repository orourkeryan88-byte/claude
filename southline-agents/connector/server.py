#!/usr/bin/env python3
"""Receptionist <-> CRM connector.

A small webhook server. Point your AI phone receptionist (Vapi, Retell,
Twilio Studio, etc.) at it and every call, booking and message is written
straight into the Southline CRM (data/clients.json).

Run:
  python3 connector/server.py            # port 8080
  PORT=9000 python3 connector/server.py

Endpoints (all accept JSON POST):
  POST /webhook/call
       {"client": "Cork Cosmetic Clinic", "caller": "+353851234567",
        "duration_s": 94, "summary": "asked lip filler prices",
        "outcome": "answered"}
  POST /webhook/booking
       {"client": "Cork Cosmetic Clinic", "caller": "+353851234567",
        "when": "2026-07-24 14:00", "what": "lip filler consult",
        "customer_name": "Aoife"}
  POST /webhook/message
       {"client": "Cork Cosmetic Clinic", "caller": "+353851234567",
        "message": "please call me back about botox"}
  GET  /health

If "client" is omitted, set DEFAULT_CLIENT below (single-client setups) —
for now it defaults to your first client.

Provider notes are in connector/README.md.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "crm"))
import crm  # noqa: E402
import notify  # noqa: E402  (same directory)

DEFAULT_CLIENT = os.environ.get("DEFAULT_CLIENT", "Cork Cosmetic Clinic")


def record(kind: str, payload: dict) -> tuple[int, str]:
    db = crm.load()
    name = payload.get("client") or DEFAULT_CLIENT
    c = crm.find(db, name)
    if not c:
        return 404, f"client '{name}' not in CRM"

    when = crm.now()
    if kind == "call":
        c.setdefault("calls", []).append({
            "when": when,
            "caller": payload.get("caller", ""),
            "duration_s": payload.get("duration_s", 0),
            "summary": payload.get("summary", ""),
            "outcome": payload.get("outcome", ""),
        })
    elif kind == "booking":
        c.setdefault("bookings", []).append({
            "when": payload.get("when", ""),
            "what": payload.get("what", ""),
            "customer_name": payload.get("customer_name", ""),
            "caller": payload.get("caller", ""),
            "logged": when,
            "status": "confirmed",
        })
    elif kind == "message":
        c.setdefault("notes", []).append({
            "when": when,
            "text": f"MESSAGE from {payload.get('caller', 'unknown')}: "
                    f"{payload.get('message', '')}",
        })
    else:
        return 400, f"unknown event kind '{kind}'"

    crm.save(db)
    notify.client_notification(c, kind, payload)
    return 200, "ok"


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: str) -> None:
        data = json.dumps({"status": body}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            self._send(200, "ok")
        else:
            self._send(404, "not found")

    def do_POST(self):  # noqa: N802
        parts = self.path.strip("/").split("/")
        if len(parts) != 2 or parts[0] != "webhook":
            self._send(404, "not found")
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send(400, "invalid JSON")
            return
        code, msg = record(parts[1], payload)
        self._send(code, msg)
        print(f"[{parts[1]}] {msg}: {json.dumps(payload)[:120]}")


def main() -> None:
    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Receptionist->CRM connector listening on :{port}")
    print(f"Default client: {DEFAULT_CLIENT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
