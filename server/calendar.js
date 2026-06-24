/**
 * Southline AI Receptionist — Google Calendar booking
 * ----------------------------------------------------
 * Adds two endpoints to the webhook server:
 *   GET  /availability   -> next free appointment slots (reads the real calendar)
 *   POST /book           -> writes a real event into Google Calendar
 *
 * The AI receptionist calls these via its check_availability / book_appointment
 * tools (see vapi/assistant.template.json). One deployment serves every client —
 * each client's calendar id + service account travel in env / assistant metadata.
 *
 * AUTH: a Google service account (server-to-server, no user login).
 *   1. Google Cloud Console -> enable "Google Calendar API".
 *   2. Create a Service Account -> create a JSON key.
 *   3. In the client's Google Calendar settings -> "Share with specific people"
 *      -> add the service account email -> "Make changes to events".
 *   4. Set env vars (see server/.env.example):
 *        GOOGLE_CALENDAR_ID, GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, TIMEZONE
 *
 * If it isn't configured yet, the endpoints still work in DEMO mode (they return
 * realistic generated slots and a simulated booking) so the demo never breaks.
 */

const TZ        = process.env.TIMEZONE || "Europe/Dublin";
const CAL_ID    = process.env.GOOGLE_CALENDAR_ID || "";
const SA_EMAIL  = process.env.GOOGLE_SA_EMAIL || "";
const SA_KEY    = (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const OPEN_HOUR  = parseInt(process.env.OPEN_HOUR || "9", 10);
const CLOSE_HOUR = parseInt(process.env.CLOSE_HOUR || "17", 10);
const SLOT_MINS  = parseInt(process.env.SLOT_MINS || "30", 10);

const configured = () => !!(CAL_ID && SA_EMAIL && SA_KEY);

function getCalendar() {
  const { google } = require("googleapis"); // lazy: only needed when configured
  const auth = new google.auth.JWT(SA_EMAIL, null, SA_KEY, [
    "https://www.googleapis.com/auth/calendar",
  ]);
  return google.calendar({ version: "v3", auth });
}

/* ---- timezone helpers (no external deps) ---- */
// Offset (ms) of `tz` at the given instant.
function tzOffsetMs(date, tz) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = f.formatToParts(date).reduce((a, x) => ((a[x.type] = x.value), a), {});
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour === "24" ? 0 : p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}
// Convert a wall-clock time in `tz` to a real UTC instant (ms).
function wallToInstant(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const off = tzOffsetMs(new Date(guess), tz);
  return guess - off;
}
function parts(instant, tz) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const p = f.formatToParts(new Date(instant)).reduce((a, x) => ((a[x.type] = x.value), a), {});
  return { y: +p.year, mo: +p.month, d: +p.day, wd: p.weekday };
}
function label(instant) {
  return new Date(instant).toLocaleString("en-IE", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

// Build candidate business-hour slots for the next `days` weekdays.
function candidateSlots(days = 7, limit = 6) {
  const out = [];
  const now = Date.now();
  for (let dayAdd = 1; dayAdd <= days && out.length < limit * 4; dayAdd++) {
    const probe = parts(now + dayAdd * 86400000, TZ);
    if (probe.wd === "Sat" || probe.wd === "Sun") continue;
    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      for (let mi = 0; mi < 60; mi += SLOT_MINS) {
        const inst = wallToInstant(probe.y, probe.mo, probe.d, h, mi, TZ);
        if (inst > now) out.push({ id: new Date(inst).toISOString(), start: inst, label: label(inst) });
      }
    }
  }
  return out;
}

async function freeSlots(limit = 6) {
  const cands = candidateSlots(7, limit);
  if (!configured()) {
    // demo mode: pretend the first couple are taken
    return { configured: false, slots: cands.filter((_, i) => i % 3 !== 0).slice(0, limit) };
  }
  const cal = getCalendar();
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 8 * 86400000).toISOString();
  const fb = await cal.freebusy.query({
    requestBody: { timeMin, timeMax, timeZone: TZ, items: [{ id: CAL_ID }] },
  });
  const busy = (fb.data.calendars[CAL_ID]?.busy || []).map((b) => [Date.parse(b.start), Date.parse(b.end)]);
  const slotMs = SLOT_MINS * 60000;
  const free = cands.filter((s) => {
    const a = s.start, b = s.start + slotMs;
    return !busy.some(([bs, be]) => a < be && b > bs);
  });
  return { configured: true, slots: free.slice(0, limit) };
}

async function book({ startISO, durationMins, name, phone, reason }) {
  const start = Date.parse(startISO);
  if (!start) return { ok: false, error: "invalid start time" };
  const dur = (durationMins || SLOT_MINS) * 60000;
  const when = label(start);

  if (!configured()) {
    return { ok: true, simulated: true, when, message: `Booked for ${when} (demo — connect Google Calendar to write it live).` };
  }
  const cal = getCalendar();
  const ev = await cal.events.insert({
    calendarId: CAL_ID,
    requestBody: {
      summary: `${reason || "Appointment"} — ${name || "Caller"}`,
      description: `Booked by the AI receptionist.\nCaller: ${name || "?"}\nPhone: ${phone || "?"}\nReason: ${reason || "?"}`,
      start: { dateTime: new Date(start).toISOString(), timeZone: TZ },
      end: { dateTime: new Date(start + dur).toISOString(), timeZone: TZ },
    },
  });
  return { ok: true, when, eventLink: ev.data.htmlLink, message: `Booked for ${when}.` };
}

// Mount the routes onto an existing Express app.
function mountCalendar(app) {
  app.get("/availability", async (_req, res) => {
    try { res.json(await freeSlots(6)); }
    catch (e) { console.error("availability error", e.message); res.json({ configured: false, slots: candidateSlots(7, 6).slice(0, 6) }); }
  });
  app.post("/book", async (req, res) => {
    try {
      const a = req.body?.message?.functionCall?.parameters || req.body?.parameters || req.body || {};
      const out = await book({
        startISO: a.startISO || a.start || a.id,
        durationMins: a.durationMins,
        name: a.name, phone: a.phone, reason: a.reason,
      });
      // shape the reply for Vapi (result string) and for the dashboard (json)
      res.json({ ...out, result: out.ok ? out.message : "I couldn't lock that slot — I'll have the team confirm." });
    } catch (e) {
      console.error("book error", e.message);
      res.json({ ok: false, result: "I'll have the team confirm that time with you." });
    }
  });
  console.log(`Calendar booking mounted (${configured() ? "Google Calendar LIVE" : "demo mode — set GOOGLE_* env to go live"})`);
}

module.exports = { mountCalendar, freeSlots, book, configured, _internals: { candidateSlots, wallToInstant, label } };
