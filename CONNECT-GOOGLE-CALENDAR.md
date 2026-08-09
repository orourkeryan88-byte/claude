# Connect Google Calendar — 10-minute checklist

Do this once to flip the receptionist from **simulated** booking to **real** bookings in a client's Google Calendar. After this, the AI checks real availability and writes real events — no code changes.

You'll create a **service account** (a robot Google login) and share the client's calendar with it. That's the whole trick.

---

## Part 1 — Google Cloud (5 min)

1. Go to **console.cloud.google.com** → sign in → create a project (top bar → **New Project** → name it "Receptionist").
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   - Name it `receptionist` → **Create and continue** → skip the optional steps → **Done**.
4. Click the new service account → **Keys → Add key → Create new key → JSON → Create.**
   - A `.json` file downloads. Open it. You need two values from it:
     - `client_email` (looks like `receptionist@your-project.iam.gserviceaccount.com`)
     - `private_key` (a long `-----BEGIN PRIVATE KEY-----…` block)

---

## Part 2 — Share the client's calendar (2 min)

5. Open **Google Calendar** (the account that owns the client's calendar).
6. Hover the calendar (left list) → **⋮ → Settings and sharing**.
7. **Share with specific people → Add people →** paste the `client_email` from step 4 → permission **"Make changes to events" → Send.**
8. On the same settings page, scroll to **Integrate calendar → Calendar ID** → copy it
   (a personal calendar's ID is just the Gmail address; a shared one looks like `…@group.calendar.google.com`).

---

## Part 3 — Plug it into your server (3 min)

9. On your deployed webhook (e.g. Render → your service → **Environment**), add these variables:

   | Variable | Value |
   |---|---|
   | `GOOGLE_CALENDAR_ID` | the Calendar ID from step 8 |
   | `GOOGLE_SA_EMAIL` | the `client_email` from step 4 |
   | `GOOGLE_SA_PRIVATE_KEY` | the `private_key` from step 4 (keep the `\n`s, wrap in quotes) |
   | `TIMEZONE` | `Europe/Dublin` |
   | `OPEN_HOUR` / `CLOSE_HOUR` / `SLOT_MINS` | e.g. `9` / `17` / `30` (optional) |

   > Not deployed yet? Deploy `server/` first (Render → New Web Service → root `server`, build `npm install`, start `node log-lead.js`). `npm install` pulls in `googleapis`.

10. **Redeploy / restart.** On boot the log should say `Calendar booking mounted (Google Calendar LIVE)`.

---

## Part 4 — Test it (1 min)

11. Visit `https://your-app.../availability` in a browser → you should see real open slots (JSON).
12. Call the assistant's number → *"Can I book in tomorrow at 10?"* → it checks the **real** calendar, books it (or offers 11 if 10's taken), and the event appears in the client's Google Calendar. ✅

---

## Per new client

Just steps 5–9 again: share that client's calendar with the **same** service account email, grab that calendar's ID, and set it (a separate assistant/deploy per client, or pass the calendar ID in per-client config). The service account from Part 1 is reused forever.

## Troubleshooting

- **Still says "demo mode"** → one of the three `GOOGLE_*` vars is missing/blank.
- **403 / not found on booking** → the calendar wasn't shared with the service account, or wrong Calendar ID.
- **Wrong times** → check `TIMEZONE` is `Europe/Dublin`.
- **Private key errors** → make sure the whole key is on one line with `\n` kept, wrapped in double quotes.

That's it — once the log says **LIVE**, every "tomorrow at 10" books for real.
