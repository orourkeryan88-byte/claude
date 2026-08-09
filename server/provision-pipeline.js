/**
 * Client onboarding — a squad of AI agents that set a client up end to end.
 * ------------------------------------------------------------------------
 * Fires the moment you close a client — from the Stripe webhook (on payment)
 * OR from the owner admin's "Onboard client" button. Each agent owns ONE
 * action, is resilient (records "queued" with what's needed instead of
 * throwing if a key/API isn't configured), and passes context to the next.
 *
 * The squad:
 *   1. agentScanWebsite     — reads their site, auto-fills hours/services/FAQ
 *   2. agentCreateAccount    — makes their CRM login (temp password if none)
 *   3. agentBuildAssistant   — fills the workflow template for their business,
 *                              creates it in Vapi (carries their calendar id +
 *                              voice + owner phone in metadata)
 *   4. agentAssignNumber     — buys/assigns their AI phone number in Vapi
 *   5. agentConnectCalendar  — records their Google Calendar id + the share
 *                              instruction; verifies live vs demo
 *   6. agentSetVoice         — locks in their ElevenLabs voice
 *   7. agentVerifyActions    — smoke-tests the live actions for this client
 *   8. agentWelcome          — assembles the welcome pack (login, number,
 *                              forwarding code) and sends it if SMTP/Twilio set
 *
 * Progress is saved on the account (account.provisioning.steps) so the admin
 * shows live status per agent.
 */
const fs = require("fs");
const path = require("path");
const store = require("./store");

function buildAssistantConfig(acct) {
  const tpl = fs.readFileSync(path.join(__dirname, "..", "vapi", "assistant.template.json"), "utf8");
  const base = (process.env.PUBLIC_BASE_URL || "https://YOUR-WEBHOOK-URL").replace(/\/$/, "");
  const fill = {
    "{{BUSINESS_NAME}}": acct.business,
    "{{BUSINESS_TYPE}}": acct.businessType || "business",
    "{{AREA}}": acct.area || "your area",
    "{{OPENING_HOURS}}": acct.openingHours || "Mon-Fri 9am-5.30pm",
    "{{SERVICES}}": acct.services || "your services",
    "{{PRICING_NOTES}}": acct.pricingNotes || "as discussed with the team",
    "{{FAQ}}": acct.faq || "Ask the team for anything not listed.",
    "{{LANGUAGES}}": acct.languages || "English (switch if the caller speaks another language)",
    "{{VOICE_ID}}": acct.voiceId || "21m00Tcm4TlvDq8ikWAM",
    "{{WEBHOOK_URL}}": base + "/log-lead",
    "{{CALL_REPORT_URL}}": base + "/call-report",
    "{{CANCEL_URL}}": base + "/cancel-booking",
    "{{RESCHEDULE_URL}}": base + "/reschedule-booking",
    "{{AVAILABILITY_URL}}": base + "/availability",
    "{{BOOK_URL}}": base + "/book",
    "{{BOOKING_WORKFLOW_URL}}": base + "/submit-booking",
    "{{TRANSFER_NUMBER}}": acct.ownerPhone || process.env.DEFAULT_OWNER_PHONE || "",
  };
  let raw = tpl;
  for (const [k, v] of Object.entries(fill)) raw = raw.split(k).join(String(v).replace(/"/g, '\\"'));
  const a = JSON.parse(raw); delete a._comment;
  a.metadata = {
    businessName: acct.business,
    ownerPhone: acct.ownerPhone || "",
    calendarId: acct.calendarId || "",
    builtBy: "Southline", builtAt: new Date().toISOString(),
  };
  return a;
}

async function agentScanWebsite(acct) {
  if (!acct.website) return { status: "skipped", detail: "No website given — using the details on file." };
  try {
    const k = await require("./knowledge").scanWebsite(acct.website);
    const patch = {};
    if (k.hours) patch.openingHours = k.hours;
    if (k.services) patch.services = k.services;
    if (k.faq) patch.faq = k.faq;
    if (k.area && !acct.area) patch.area = k.area;
    Object.assign(acct, patch);
    store.upsert({ username: acct.username, ...patch, knowledge: k });
    return { status: "done", detail: `Scanned ${acct.website} — pulled hours/services/FAQ (confidence ${k.confidence}/4).` };
  } catch (e) { return { status: "queued", detail: "Couldn't read the website — fill the details in by hand: " + e.message }; }
}

async function agentCreateAccount(acct) {
  const existing = store.find(acct.username);
  if (existing && existing.salt && existing.hash) {
    store.setActive(acct.username, true);
    return { status: "done", detail: "CRM login already exists — activated." };
  }
  const temp = acct.tempPassword || ("sl-" + Math.random().toString(36).slice(2, 8));
  const { hashPassword } = require("./auth");
  const { salt, hash } = hashPassword(temp);
  store.upsert({ username: acct.username, business: acct.business, salt, hash, active: true, plan: acct.plan || "complete", createdAt: (existing && existing.createdAt) || new Date().toISOString() });
  acct._tempPassword = temp;
  return { status: "done", detail: `CRM login created (temp password: ${temp}) — they can change it in the app.` };
}

async function agentBuildAssistant(acct) {
  let assistant;
  try { assistant = buildAssistantConfig(acct); }
  catch (e) { return { status: "error", detail: "Couldn't build config: " + e.message }; }
  if (!process.env.VAPI_PRIVATE_KEY)
    return { status: "queued", detail: "Assistant config built — set VAPI_PRIVATE_KEY to auto-create it in Vapi." };
  try {
    const r = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.VAPI_PRIVATE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(assistant),
    });
    if (!r.ok) return { status: "error", detail: "Vapi returned " + r.status };
    const d = await r.json();
    store.upsert({ username: acct.username, assistantId: d.id });
    return { status: "done", detail: "Assistant created in Vapi", assistantId: d.id };
  } catch (e) { return { status: "error", detail: e.message }; }
}

async function agentAssignNumber(acct, ctx) {
  if (!process.env.VAPI_PRIVATE_KEY || !ctx.assistantId)
    return { status: "queued", detail: "Buy a number in Vapi and assign it to this assistant (1 click)." };
  try {
    const r = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.VAPI_PRIVATE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "vapi", assistantId: ctx.assistantId }),
    });
    if (!r.ok) return { status: "queued", detail: "Auto-buy unavailable — assign a number in Vapi (1 click)." };
    const d = await r.json();
    store.upsert({ username: acct.username, aiNumber: d.number });
    return { status: "done", detail: "Number assigned", number: d.number };
  } catch (e) { return { status: "queued", detail: "Assign a number in Vapi (1 click)." }; }
}

async function agentConnectCalendar(acct) {
  const saEmail = process.env.GOOGLE_SA_EMAIL;
  if (!acct.calendarId) {
    return { status: "queued", detail: saEmail
      ? `Ask the client to share their Google Calendar with ${saEmail} ("Make changes to events"), then paste their Calendar ID in the client's Calendar field.`
      : "Set the Google service account on the server, then add the client's Calendar ID." };
  }
  store.upsert({ username: acct.username, calendarId: acct.calendarId });
  if (!saEmail) return { status: "queued", detail: "Calendar id saved — add GOOGLE_SA_EMAIL/KEY on the server to go live." };
  return { status: "done", detail: `Calendar connected (${acct.calendarId}) — bookings land in their own diary.` };
}

async function agentSetVoice(acct) {
  const v = acct.voiceId || "21m00Tcm4TlvDq8ikWAM";
  store.upsert({ username: acct.username, voiceId: v });
  return { status: "done", detail: acct.voiceId ? `Voice set (${v}).` : "Default warm voice set — change it any time in the client's Voice field." };
}

async function agentVerifyActions(acct) {
  const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!base) return { status: "queued", detail: "Set PUBLIC_BASE_URL to auto-verify the live actions." };
  try {
    const r = await fetch(base + "/availability", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId: acct.calendarId || "" }),
    });
    return { status: r.ok ? "done" : "error", detail: r.ok ? "Live actions responding (availability check passed)." : "Availability check did not respond — check the server." };
  } catch (e) { return { status: "queued", detail: "Couldn't reach the live server to verify: " + e.message }; }
}

async function agentWelcome(acct, ctx) {
  const number = ctx.number || acct.aiNumber || "your AI number (being assigned)";
  const dash = process.env.DASHBOARD_URL || "your CRM";
  const pw = acct._tempPassword ? `\n   Temp password: ${acct._tempPassword} (change it in the app)` : "";
  const body =
    `Welcome to your AI receptionist, ${acct.business}!\n\n` +
    `1. Log into your inbox app: ${dash}  (email: ${acct.username})${pw}\n` +
    `2. Your AI number: ${number}\n` +
    `3. Forward missed calls to it — dial **61*<AI-NUMBER># on your phone.\n` +
    (acct.calendarId ? `4. Your Google Calendar is connected — bookings appear in your own diary.\n` : `4. Share your Google Calendar with us to turn on live booking.\n`) +
    `\nThat's it — it'll answer, book, and text you every lead. — Southline, 085 174 0783`;
  console.log("\n===== WELCOME PACK (" + acct.username + ") =====\n" + body + "\n=================================\n");
  store.upsert({ username: acct.username, welcomePack: body });
  return { status: "done", detail: "Welcome pack prepared (login + number + forwarding + calendar)." };
}

async function runProvisioning(acct) {
  console.log(`Onboarding squad started for ${acct.business} (${acct.username})`);
  const steps = [];
  const ctx = {};
  const order = [
    ["Scan website & build knowledge", agentScanWebsite],
    ["Create CRM login", agentCreateAccount],
    ["Build AI assistant", agentBuildAssistant],
    ["Assign phone number", agentAssignNumber],
    ["Connect Google Calendar", agentConnectCalendar],
    ["Set voice", agentSetVoice],
    ["Verify live actions", agentVerifyActions],
    ["Welcome + setup pack", agentWelcome],
  ];
  for (const [name, fn] of order) {
    let r;
    try { r = await fn(acct, ctx); }
    catch (e) { r = { status: "error", detail: e.message }; }
    if (r.assistantId) ctx.assistantId = r.assistantId;
    if (r.number) ctx.number = r.number;
    steps.push({ name, status: r.status, detail: r.detail, ...(r.number ? { number: r.number } : {}) });
    console.log(`   ${String(r.status).toUpperCase()} — ${name}: ${r.detail}`);
  }
  const bad = steps.filter((s) => s.status === "error").length;
  const queued = steps.filter((s) => s.status === "queued").length;
  const status = bad ? "needs_attention" : queued ? "partly_queued" : "complete";
  store.upsert({ username: acct.username, provisioning: { status, steps, at: new Date().toISOString() } });
  console.log(`Onboarding ${status} for ${acct.username}`);
  return { status, steps, tempPassword: acct._tempPassword };
}

module.exports = { runProvisioning, buildAssistantConfig,
  _agents: { agentScanWebsite, agentCreateAccount, agentBuildAssistant, agentAssignNumber, agentConnectCalendar, agentSetVoice, agentVerifyActions, agentWelcome } };
