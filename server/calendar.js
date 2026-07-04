/**
 * Southline AI Receptionist — Google Calendar booking
 * ----------------------------------------------------
 * Endpoints (all used by the assistant's tools; GETs also work in a browser):
 *   GET/POST /availability        next free slots, or check a specific time
 *   POST     /book                book (re-checks the slot first — no double booking)
 *   POST     /cancel-booking      cancel by booking reference or phone number
 *   POST     /reschedule-booking  move a booking to a new time (checks it first)
 *   GET      /bookings            upcoming bookings ledger (?phone= to filter)
 *
 * Every booking gets a short reference (e.g. SL-4KQ2) the caller can quote to
 * cancel or move it. Bookings are stored in BOOKINGS_FILE (default
 * server/bookings.json) in BOTH live and demo mode, and a confirmation SMS is
 * texted to the caller when Twilio is configured.
 *
 * Business rules (env):
 *   OPEN_HOUR / CLOSE_HOUR   e.g. 9 / 17.5  (17.5 = 5:30pm)
 *   OPEN_DAYS                e.g. "Mon,Tue,Wed,Thu,Fri" (default) or add Sat
 *   LUNCH_START / LUNCH_END  optional daily break, e.g. 13 / 14
 *   BUFFER_MINS              gap kept free around existing events (default 0)
 *   SLOT_MINS                appointment length (default 30)
 *
 * AUTH: a Google service account — see .env.example. Without it everything
 * runs in DEMO mode (realistic slots, simulated writes) so demos never break.
 */

const fs = require("fs");
const path = require("path");

const TZ        = process.env.TIMEZONE || "Europe/Dublin";
const CAL_ID    = process.env.GOOGLE_CALENDAR_ID || "";
const SA_EMAIL  = process.env.GOOGLE_SA_EMAIL || "";
const SA_KEY    = (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const OPEN_HOUR   = parseFloat(process.env.OPEN_HOUR || "9");
const CLOSE_HOUR  = parseFloat(process.env.CLOSE_HOUR || "17");
const SLOT_MINS   = parseInt(process.env.SLOT_MINS || "30", 10);
const BUFFER_MINS = parseInt(process.env.BUFFER_MINS || "0", 10);
const LUNCH_START = process.env.LUNCH_START ? parseFloat(process.env.LUNCH_START) : null;
const LUNCH_END   = process.env.LUNCH_END ? parseFloat(process.env.LUNCH_END) : null;
const OPEN_DAYS   = (process.env.OPEN_DAYS || "Mon,Tue,Wed,Thu,Fri").split(",").map((d) => d.trim().slice(0, 3));

const configured = () => !!(CAL_ID && SA_EMAIL && SA_KEY);

function getCalendar() {
  const { google } = require("googleapis"); // lazy: only needed when configured
  const auth = new google.auth.JWT(SA_EMAIL, null, SA_KEY, [
    "https://www.googleapis.com/auth/calendar",
  ]);
  return google.calendar({ version: "v3", auth });
}

/* ---------- bookings ledger (works in demo AND live mode) ---------- */
const BOOKINGS_FILE = process.env.BOOKINGS_FILE || path.join(__dirname, "bookings.json");
function readBookings() { try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8")); } catch (e) { return []; } }
function writeBookings(list) {
  try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2)); }
  catch (e) { console.warn("bookings write failed:", e.message); }
}
function makeRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to say on the phone
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return "SL-" + r;
}
const normPhone = (p) => String(p || "").replace(/\D/g, "");
// Same number whether said as "087 123 4567" or "+353 87 123 4567":
// compare the last 9 digits (7 for very short numbers).
function samePhone(a, b) {
  const x = normPhone(a), y = normPhone(b);
  if (!x || !y) return false;
  const n = Math.min(9, x.length, y.length);
  return n >= 7 && x.slice(-n) === y.slice(-n);
}
function findBooking({ reference, phone }) {
  const list = readBookings();
  if (reference) {
    const ref = String(reference).toUpperCase().replace(/\s/g, "");
    const hit = list.find((b) => b.ref === ref && b.status === "confirmed");
    if (hit) return hit;
  }
  if (phone) {
    // latest upcoming confirmed booking from this number
    return list
      .filter((b) => b.status === "confirmed" && samePhone(b.phone, phone) && Date.parse(b.startISO) > Date.now())
      .sort((a, b) => Date.parse(a.startISO) - Date.parse(b.startISO))[0] || null;
  }
  return null;
}
function updateBooking(ref, patch) {
  const list = readBookings();
  const b = list.find((x) => x.ref === ref);
  if (b) { Object.assign(b, patch); writeBookings(list); }
  return b;
}

/* ---------- caller SMS (confirmation / cancellation / move) ---------- */
async function smsCaller(phone, body) {
  if (!phone || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_FROM_NUMBER) return false;
  try {
    const tw = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await tw.messages.create({ to: phone, from: process.env.TWILIO_FROM_NUMBER, body });
    return true;
  } catch (e) { console.warn("caller SMS failed:", e.message); return false; }
}

/* ---- timezone helpers (no external deps) ---- */
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
function hourOf(instant) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const p = f.formatToParts(new Date(instant)).reduce((a, x) => ((a[x.type] = x.value), a), {});
  return Number(p.hour) + Number(p.minute) / 60;
}

/* ---------- business rules ---------- */
// Is this instant inside opening hours (day open, not lunch, inside open..close)?
function inBusinessHours(instant) {
  const p = parts(instant, TZ);
  if (!OPEN_DAYS.includes(p.wd)) return false;
  const h = hourOf(instant);
  const hEnd = h + SLOT_MINS / 60;
  if (h < OPEN_HOUR || hEnd > CLOSE_HOUR) return false;
  if (LUNCH_START != null && LUNCH_END != null && h < LUNCH_END && hEnd > LUNCH_START) return false;
  return true;
}

// Build candidate slots for the next `days` open days.
function candidateSlots(days = 7, limit = 6) {
  const out = [];
  const now = Date.now();
  for (let dayAdd = 1; dayAdd <= days && out.length < limit * 4; dayAdd++) {
    const probe = parts(now + dayAdd * 86400000, TZ);
    for (let h = Math.floor(OPEN_HOUR); h < Math.ceil(CLOSE_HOUR); h++) {
      for (let mi = 0; mi < 60; mi += SLOT_MINS) {
        const inst = wallToInstant(probe.y, probe.mo, probe.d, h, mi, TZ);
        if (inst > now && inBusinessHours(inst)) {
          out.push({ id: new Date(inst).toISOString(), start: inst, label: label(inst) });
        }
      }
    }
  }
  return out;
}

// Busy intervals from Google (buffer applied), over [fromMs, toMs].
async function busyIntervals(fromMs, toMs) {
  const cal = getCalendar();
  const fb = await cal.freebusy.query({
    requestBody: { timeMin: new Date(fromMs).toISOString(), timeMax: new Date(toMs).toISOString(), timeZone: TZ, items: [{ id: CAL_ID }] },
  });
  const buf = BUFFER_MINS * 60000;
  return (fb.data.calendars[CAL_ID]?.busy || []).map((b) => [Date.parse(b.start) - buf, Date.parse(b.end) + buf]);
}
// Demo-mode "busy": bookings already taken in the local ledger count as busy,
// so even without Google the AI can't double-book a slot.
function demoBusy() {
  const buf = BUFFER_MINS * 60000;
  return readBookings()
    .filter((b) => b.status === "confirmed")
    .map((b) => [Date.parse(b.startISO) - buf, Date.parse(b.startISO) + (b.durationMins || SLOT_MINS) * 60000 + buf]);
}

async function freeSlots(limit = 6) {
  const cands = candidateSlots(7, limit);
  const slotMs = SLOT_MINS * 60000;
  let busy;
  if (!configured()) {
    busy = demoBusy();
  } else {
    busy = await busyIntervals(Date.now(), Date.now() + 8 * 86400000);
  }
  const free = cands.filter((s) => {
    const a = s.start, b = s.start + slotMs;
    return !busy.some(([bs, be]) => a < be && b > bs);
  });
  return { configured: configured(), slots: free.slice(0, limit) };
}

// Is one specific instant bookable right now?
async function slotFree(instant) {
  if (!inBusinessHours(instant) || instant <= Date.now()) return false;
  const slotMs = SLOT_MINS * 60000;
  const busy = configured() ? await busyIntervals(instant - slotMs, instant + slotMs) : demoBusy();
  return !busy.some(([bs, be]) => instant < be && instant + slotMs > bs);
}

function parseWhen({ datetime, date, time }) {
  if (datetime) { const t = Date.parse(datetime); return isNaN(t) ? null : t; }
  if (date && time) {
    const [y, mo, d] = String(date).split("-").map(Number);
    const m = String(time).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let h = m ? parseInt(m[1], 10) : 9;
    const mi = m && m[2] ? parseInt(m[2], 10) : 0;
    if (m && m[3]) { const pm = /pm/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return wallToInstant(y, mo, d, h, mi, TZ);
  }
  return null;
}

// Check whether a SPECIFIC requested time is free (e.g. "tomorrow at 10").
async function checkRequested({ datetime, date, time }) {
  const instant = parseWhen({ datetime, date, time });
  if (!instant) {
    const fb = await freeSlots(4);
    return { ...fb, requested: null, result: "I didn't catch an exact time — here are the next open slots." };
  }
  const available = await slotFree(instant);
  const reqSlot = { id: new Date(instant).toISOString(), start: instant, label: label(instant), available };
  if (available) {
    return { configured: configured(), requested: reqSlot, slots: [reqSlot],
             result: `Yes, ${reqSlot.label} is free — shall I book that in?` };
  }
  const alts = await nearbyAlternatives(instant, 3);
  const why = instant <= Date.now() ? "that time has passed"
    : !inBusinessHours(instant) ? "we're closed then" : "that one's already taken";
  const list = alts.map((s) => s.label).join(", or ");
  const result = alts.length
    ? `Sorry, ${why}. The nearest I have is ${list} — would any of those suit, or is there another time that works for you?`
    : `Sorry, ${why}, and I don't have much that day. Is there another day or time that suits you?`;
  return { configured: configured(), requested: reqSlot, slots: alts, result };
}

// Free slots ranked by closeness to the requested time.
async function nearbyAlternatives(instant, limit = 3) {
  const all = (await freeSlots(40)).slots;
  const r = parts(instant, TZ);
  const sameDay = (s) => { const p = parts(s.start, TZ); return p.y === r.y && p.mo === r.mo && p.d === r.d; };
  const afterSame = all.filter((s) => sameDay(s) && s.start > instant);
  const beforeSame = all.filter((s) => sameDay(s) && s.start < instant).reverse();
  const otherDays = all.filter((s) => !sameDay(s));
  const ranked = [...afterSame, ...beforeSame, ...otherDays];
  const seen = new Set(); const out = [];
  for (const s of ranked) { if (!seen.has(s.id)) { seen.add(s.id); out.push(s); } if (out.length >= limit) break; }
  return out;
}

/* ---------- book (re-checks first: no double booking) ---------- */
async function book({ startISO, durationMins, name, phone, reason, business }) {
  const start = Date.parse(startISO);
  if (!start) return { ok: false, error: "invalid start time" };
  const dur = (durationMins || SLOT_MINS) * 60000;
  const when = label(start);

  // Final availability check right before writing — beats double-booking races
  // and stops the AI booking a slot another call just took.
  if (!(await slotFree(start))) {
    const alts = await nearbyAlternatives(start, 3);
    const list = alts.map((s) => s.label).join(", or ");
    return { ok: false, taken: true, slots: alts,
      result: alts.length
        ? `Ah — that slot was just taken. The nearest I have is ${list}. Would one of those work?`
        : `Ah — that slot was just taken and that day is now full. Is there another day that suits?` };
  }

  const ref = makeRef();
  let eventId = "", eventLink = "";
  if (configured()) {
    const cal = getCalendar();
    const ev = await cal.events.insert({
      calendarId: CAL_ID,
      requestBody: {
        summary: `${reason || "Appointment"} — ${name || "Caller"} [${ref}]`,
        description: `Booked by the AI receptionist.\nRef: ${ref}\nCaller: ${name || "?"}\nPhone: ${phone || "?"}\nReason: ${reason || "?"}`,
        start: { dateTime: new Date(start).toISOString(), timeZone: TZ },
        end: { dateTime: new Date(start + dur).toISOString(), timeZone: TZ },
      },
    });
    eventId = ev.data.id; eventLink = ev.data.htmlLink;
  }

  const record = { ref, name: name || "", phone: phone || "", reason: reason || "",
    business: business || "", startISO: new Date(start).toISOString(),
    durationMins: durationMins || SLOT_MINS, eventId, status: "confirmed",
    simulated: !configured(), createdAt: new Date().toISOString() };
  writeBookings([record, ...readBookings()]);

  const smsSent = await smsCaller(phone,
    `Your appointment is booked for ${when}. Ref ${ref} — reply or call if you need to change it. ${business ? "— " + business : ""}`.trim());

  return { ok: true, when, ref, eventLink, smsSent, simulated: !configured(),
    message: `Booked for ${when}. Your reference is ${ref}.` };
}

/* ---------- cancel ---------- */
async function cancelBooking({ reference, phone }) {
  const b = findBooking({ reference, phone });
  if (!b) return { ok: false, result: "I couldn't find a booking under that — could you check the reference, or the number it was booked with?" };
  if (configured() && b.eventId) {
    try { await getCalendar().events.delete({ calendarId: CAL_ID, eventId: b.eventId }); }
    catch (e) { console.warn("event delete failed:", e.message); }
  }
  updateBooking(b.ref, { status: "cancelled", cancelledAt: new Date().toISOString() });
  await smsCaller(b.phone, `Your appointment for ${label(Date.parse(b.startISO))} (ref ${b.ref}) has been cancelled. Call us any time to rebook.`);
  return { ok: true, ref: b.ref, result: `Done — I've cancelled the ${label(Date.parse(b.startISO))} appointment (ref ${b.ref}). Would you like to book another time instead?` };
}

/* ---------- reschedule ---------- */
async function rescheduleBooking({ reference, phone, datetime, date, time }) {
  const b = findBooking({ reference, phone });
  if (!b) return { ok: false, result: "I couldn't find a booking under that — could you check the reference, or the number it was booked with?" };
  const instant = parseWhen({ datetime, date, time });
  if (!instant) {
    const fb = await freeSlots(4);
    return { ok: false, slots: fb.slots, result: `No problem — what time would suit instead? The next openings are ${fb.slots.slice(0, 3).map((s) => s.label).join(", or ")}.` };
  }
  if (!(await slotFree(instant))) {
    const alts = await nearbyAlternatives(instant, 3);
    const list = alts.map((s) => s.label).join(", or ");
    return { ok: false, taken: true, slots: alts,
      result: alts.length ? `That time isn't free. The nearest I have is ${list} — would one of those suit?` : `That time isn't free and that day is full — is there another day that works?` };
  }
  const dur = (b.durationMins || SLOT_MINS) * 60000;
  if (configured() && b.eventId) {
    try {
      await getCalendar().events.patch({
        calendarId: CAL_ID, eventId: b.eventId,
        requestBody: { start: { dateTime: new Date(instant).toISOString(), timeZone: TZ },
                       end: { dateTime: new Date(instant + dur).toISOString(), timeZone: TZ } },
      });
    } catch (e) { console.warn("event move failed:", e.message); }
  }
  const oldWhen = label(Date.parse(b.startISO));
  updateBooking(b.ref, { startISO: new Date(instant).toISOString(), movedFrom: b.startISO, movedAt: new Date().toISOString() });
  await smsCaller(b.phone, `Your appointment has moved to ${label(instant)} (ref ${b.ref}).`);
  return { ok: true, ref: b.ref, when: label(instant),
    result: `Done — I've moved you from ${oldWhen} to ${label(instant)}. Same reference, ${b.ref}.` };
}

/* ---------- mount ---------- */
function mountCalendar(app) {
  const params = (req) => {
    const a = req.body?.message?.functionCall?.parameters || req.body?.parameters || req.body || {};
    return { ...req.query, ...a };
  };

  async function availability(req, res) {
    try {
      const src = params(req);
      const datetime = src.datetime || src.startISO;
      if (datetime || (src.date && src.time)) {
        return res.json(await checkRequested({ datetime, date: src.date, time: src.time }));
      }
      const fb = await freeSlots(6);
      res.json({ ...fb, result: `The next openings are ${fb.slots.slice(0, 3).map((s) => s.label).join(", or ")}.` });
    } catch (e) {
      console.error("availability error", e.message);
      res.json({ configured: false, slots: candidateSlots(7, 6).slice(0, 6) });
    }
  }
  app.get("/availability", availability);
  app.post("/availability", availability);

  app.post("/book", async (req, res) => {
    try {
      const a = params(req);
      const out = await book({
        startISO: a.startISO || a.start || a.id,
        durationMins: a.durationMins, name: a.name, phone: a.phone,
        reason: a.reason, business: a.business,
      });
      res.json({ ...out, result: out.result || (out.ok ? out.message : "I couldn't lock that slot — I'll have the team confirm.") });
    } catch (e) {
      console.error("book error", e.message);
      res.json({ ok: false, result: "I'll have the team confirm that time with you." });
    }
  });

  // Rich booking from the full qualification payload (name, phone, service,
  // date, time, provider, etc.) — resolves date+time to a slot and books it.
  // This is the submit_booking tool the assistant calls with everything gathered.
  app.post("/submit-booking", async (req, res) => {
    try {
      const a = params(req);
      const instant = parseWhen({ datetime: a.datetime || a.startISO, date: a.date, time: a.time });
      if (!instant) return res.json({ ok: false, result: "I didn't catch an exact time — let me check what's free." });
      const bits = [a.service, a.appointment_type, a.provider && a.provider !== "any" ? "with " + a.provider : "", a.special_requests]
        .filter(Boolean).join(" · ");
      const out = await book({
        startISO: new Date(instant).toISOString(),
        name: a.name, phone: a.phone, reason: bits || a.reason || "Appointment", business: a.business,
      });
      res.json({ ...out, result: out.result || (out.ok ? out.message : "I couldn't lock that slot — I'll have the team confirm.") });
    } catch (e) {
      console.error("submit-booking error", e.message);
      res.json({ ok: false, result: "I'll have the team confirm that booking with you." });
    }
  });

  app.post("/cancel-booking", async (req, res) => {
    try { res.json(await cancelBooking(params(req))); }
    catch (e) { console.error("cancel error", e.message); res.json({ ok: false, result: "I'll have the team sort that cancellation for you." }); }
  });

  app.post("/reschedule-booking", async (req, res) => {
    try { res.json(await rescheduleBooking(params(req))); }
    catch (e) { console.error("reschedule error", e.message); res.json({ ok: false, result: "I'll have the team confirm the new time with you." }); }
  });

  app.get("/bookings", (req, res) => {
    let list = readBookings().filter((b) => b.status === "confirmed");
    if (req.query.phone) list = list.filter((b) => samePhone(b.phone, req.query.phone));
    if (req.query.business) list = list.filter((b) => (b.business || "") === req.query.business);
    list.sort((a, b) => Date.parse(a.startISO) - Date.parse(b.startISO));
    res.json(list);
  });

  console.log(`Calendar booking mounted (${configured() ? "Google Calendar LIVE" : "demo mode — set GOOGLE_* env to go live"}; refs+cancel+reschedule, ${OPEN_DAYS.join("/")}${LUNCH_START != null ? `, lunch ${LUNCH_START}-${LUNCH_END}` : ""}${BUFFER_MINS ? `, ${BUFFER_MINS}min buffer` : ""})`);
}

module.exports = { mountCalendar, freeSlots, book, checkRequested, cancelBooking, rescheduleBooking, configured,
  _internals: { candidateSlots, wallToInstant, label, inBusinessHours, findBooking, makeRef, BOOKINGS_FILE } };
