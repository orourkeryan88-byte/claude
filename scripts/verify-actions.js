#!/usr/bin/env node
/**
 * Verification agent — simulates a real call and exercises EVERY action.
 * ----------------------------------------------------------------------
 * It "talks to" the receptionist backend the way the AI does during a live
 * call: it fires each tool/endpoint in the order a real conversation would,
 * gathers the information that comes back, and prints a pass/fail line for
 * every action so you can see the whole action set works end to end.
 *
 *   node scripts/verify-actions.js                       # against a local server
 *   node scripts/verify-actions.js https://your.onrender.com   # against your live server
 *
 * Exit 0 = every action passed; 1 = something failed.
 */

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3990").replace(/\/$/, "");

let pass = 0, fail = 0;
const results = [];
function check(action, ok, detail) {
  results.push({ action, ok, detail });
  if (ok) pass++; else fail++;
  console.log(`${ok ? "✅" : "❌"}  ${action.padEnd(34)} ${detail || ""}`);
}
async function call(method, path, body) {
  const opt = { method, headers: { "Content-Type": "application/json" } };
  if (body) opt.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opt);
  let data = null; try { data = await r.json(); } catch (e) {}
  return { status: r.status, data };
}
// pick the next weekday and a business-hours ISO for it
function nextWeekdayISO(hour) {
  const d = new Date(); d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, iso: `${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:00:00+01:00` };
}

(async () => {
  console.log(`\n🤖 Verification agent — simulating a call against ${BASE}\n`);
  const slot = nextWeekdayISO(10);
  const caller = { name: "Sarah Byrne", phone: "+353871234567", reason: "kitchen sink leak" };

  // --- health ---
  try {
    const r = await fetch(BASE + "/");
    check("server reachable", r.ok, `HTTP ${r.status}`);
  } catch (e) { check("server reachable", false, e.message + " — is the server running / URL right?"); printSummary(); process.exit(1); }

  console.log(`\n— The call —`);
  console.log(`Caller: "Hi, I've got a ${caller.reason}."`);

  // 1. ACTION: log_lead (gather info from the call)
  let r = await call("POST", "/log-lead", {
    message: { functionCall: { parameters: { name: caller.name, phone: caller.phone, reason: caller.reason, urgency: "urgent", preferred_time: "tomorrow morning" } },
      call: { assistant: { metadata: { businessName: "Southline Demo Clinic", ownerPhone: "+353851740783" } } } } });
  check("log_lead (capture lead)", r.status === 200 && /saved|noted/i.test(r.data?.result || ""), r.data?.result || "");

  // confirm the info was actually gathered/stored
  r = await call("GET", "/leads");
  const lead = Array.isArray(r.data) ? r.data.find((l) => l.phone && l.phone.includes("1234567")) : null;
  check("lead stored & retrievable", !!lead, lead ? `gathered: ${lead.name} · ${lead.phone} · "${lead.reason}"` : "not found");

  // 2. ACTION: check_availability (specific time)
  r = await call("POST", "/availability", { date: slot.date, time: "10:00" });
  const availOk = r.status === 200 && typeof r.data?.result === "string";
  check("check_availability (10:00)", availOk, r.data?.result?.slice(0, 70));
  const calMode = r.data?.configured ? "LIVE Google Calendar" : "DEMO calendar";

  // 3. ACTION: book_appointment
  r = await call("POST", "/book", { startISO: slot.iso, name: caller.name, phone: caller.phone, reason: caller.reason });
  const ref = r.data?.ref;
  check("book_appointment", r.status === 200 && r.data?.ok === true && !!ref, ref ? `booked · reference ${ref}` : (r.data?.result || "failed"));

  // 3a. ACTION: submit_booking (rich payload booking — the assistant's booking tool)
  const slot2 = nextWeekdayISO(14);
  r = await call("POST", "/submit-booking", { name: "Tom Fitz", phone: "+353861119999", service: "check-up & clean",
    appointment_type: "new patient", provider: "any", date: slot2.date, time: "2:00pm" });
  check("submit_booking (full payload)", r.data?.ok === true && !!r.data?.ref, r.data?.ref ? `booked · ${r.data.ref}` : (r.data?.result || "failed"));

  // 3b. ACTION: no double-booking (book same slot again -> must refuse)
  r = await call("POST", "/book", { startISO: slot.iso, name: "Someone Else", phone: "+353860000000", reason: "quote" });
  check("double-booking prevented", r.data?.ok === false, r.data?.result?.slice(0, 70));

  // 4. ACTION: call-report (gather transcript/summary/recording from the call)
  r = await call("POST", "/call-report", {
    message: { type: "end-of-call-report",
      analysis: { summary: `${caller.name} reported a ${caller.reason}; booked for ${slot.date} 10:00.` },
      transcript: "AI: How can I help?\nSarah: I've a leak.\nAI: Booked you for 10.",
      recordingUrl: "https://example.com/rec.mp3",
      call: { customer: { number: caller.phone } } } });
  check("call-report (gather call data)", r.status === 200 && r.data?.ok === true, "summary + transcript + recording attached");
  r = await call("GET", "/leads");
  const enriched = Array.isArray(r.data) ? r.data.find((l) => l.phone && l.phone.includes("1234567") && l.summary) : null;
  check("call data attached to lead", !!enriched, enriched ? `summary + transcript on the lead` : "not attached");

  // 5. ACTION: reschedule_booking (by reference)
  if (ref) {
    r = await call("POST", "/reschedule-booking", { reference: ref, date: slot.date, time: "11:00" });
    check("reschedule_booking", r.data?.ok === true, r.data?.result?.slice(0, 70));
  } else check("reschedule_booking", false, "skipped — no booking reference");

  // 6. ACTION: cancel_booking (by phone number, no ref)
  r = await call("POST", "/cancel-booking", { phone: "087 123 4567" });
  check("cancel_booking (by phone)", r.data?.ok === true, r.data?.result?.slice(0, 70));

  // 7. ACTION: missed-call text-back
  r = await call("POST", "/missed-call", { phone: "+353861112223", business: "Southline Demo Clinic" });
  check("missed-call text-back", r.status === 200 && r.data?.ok === true, r.data?.textBack ? "SMS sent" : "logged (add Twilio to send SMS)");

  // 8. ACTION: spam screening
  r = await call("POST", "/log-lead", { name: "Marketer", phone: "+1555", reason: "SALES CALL: improve your Google ranking" });
  const leadsAfter = (await call("GET", "/leads")).data || [];
  const spam = Array.isArray(leadsAfter) ? leadsAfter.find((l) => l.reason && /google ranking/i.test(l.reason)) : null;
  check("spam screening", spam && spam.spam === true, spam ? "cold-sales flagged, kept out of client inbox" : "not flagged");

  // 9. ACTION: discount validation
  r = await call("POST", "/validate-discount", { code: "NONEXISTENT", setup: 350, monthly: 80 });
  check("discount validation", r.status === 200 && r.data && r.data.ok === false, "endpoint live (no codes set yet)");

  // 10. ACTION: pricing (the plan)
  r = await call("GET", "/pricing");
  const plan = r.data?.plans?.[0];
  check("pricing endpoint", !!plan, plan ? `${plan.name}: €${plan.setup} setup + €${plan.monthly}/mo` : "no plan");

  console.log(`\n🗓️  Calendar mode: ${calMode}`);
  if (calMode.startsWith("DEMO")) {
    console.log("    → To use YOUR Google Calendar, set these on Render (see below), then re-run.");
  }
  printSummary();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("agent crashed:", e.message); process.exit(1); });

function printSummary() {
  console.log(`\n${"─".repeat(52)}`);
  console.log(`ACTIONS VERIFIED: ${pass} passed, ${fail} failed`);
  if (!fail) console.log("🎉  Every action works end to end.");
  else console.log("⚠  Some actions failed — see the ❌ lines above.");
}
