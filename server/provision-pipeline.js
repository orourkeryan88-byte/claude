/**
 * Post-payment provisioning pipeline.
 * -----------------------------------
 * Fires from the Stripe webhook the moment a client's payment completes, and
 * runs a sequence of "agents" (workers) that set the client up automatically:
 *
 *   1. Build AI assistant   — fills the workflow template for their business,
 *                             and creates it in Vapi (if VAPI_PRIVATE_KEY set).
 *   2. Assign phone number  — the AI's number (auto via Vapi if a pool is set,
 *                             otherwise queued for a 1-click manual assign).
 *   3. Activate CRM login   — flips their account active so they can sign in.
 *   4. Welcome + setup pack  — prepares their login, number and call-forwarding
 *                             steps (emailed if SMTP is configured, else logged).
 *
 * Each agent is resilient: if its API/keys aren't configured it records a
 * "queued" step (with what's needed) instead of failing. Progress is saved on
 * the account (account.provisioning) so the client/agency can see status.
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
    "{{VOICE_ID}}": acct.voiceId || "21m00Tcm4TlvDq8ikWAM",
    "{{WEBHOOK_URL}}": base + "/log-lead",
    "{{AVAILABILITY_URL}}": base + "/availability",
    "{{BOOK_URL}}": base + "/book",
    "{{BOOKING_WORKFLOW_URL}}": base + "/submit-booking",
    "{{TRANSFER_NUMBER}}": acct.ownerPhone || process.env.DEFAULT_OWNER_PHONE || "",
  };
  let raw = tpl;
  for (const [k, v] of Object.entries(fill)) raw = raw.split(k).join(String(v).replace(/"/g, '\\"'));
  const a = JSON.parse(raw); delete a._comment;
  a.metadata = { businessName: acct.business, ownerPhone: acct.ownerPhone || "", builtBy: "Southline", builtAt: new Date().toISOString() };
  return a;
}

// 1) Build the assistant (and create it in Vapi if we can).
async function agentBuildAssistant(acct) {
  let assistant;
  try { assistant = buildAssistantConfig(acct); }
  catch (e) { return { status: "error", detail: "Couldn't build config: " + e.message }; }

  if (!process.env.VAPI_PRIVATE_KEY) {
    return { status: "queued", detail: "Assistant config built — set VAPI_PRIVATE_KEY to auto-create it in Vapi." };
  }
  try {
    const r = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.VAPI_PRIVATE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(assistant),
    });
    if (!r.ok) return { status: "error", detail: "Vapi returned " + r.status };
    const d = await r.json();
    return { status: "done", detail: "Assistant created in Vapi", assistantId: d.id };
  } catch (e) { return { status: "error", detail: e.message }; }
}

// 2) Assign a phone number.
async function agentAssignNumber(acct, prev) {
  if (!process.env.VAPI_PRIVATE_KEY || !prev.assistantId) {
    return { status: "queued", detail: "Buy a number in Vapi and assign it to this assistant (1 click)." };
  }
  try {
    const r = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.VAPI_PRIVATE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "vapi", assistantId: prev.assistantId }),
    });
    if (!r.ok) return { status: "queued", detail: "Auto-buy unavailable — assign a number in Vapi (1 click)." };
    const d = await r.json();
    return { status: "done", detail: "Number assigned", number: d.number };
  } catch (e) { return { status: "queued", detail: "Assign a number in Vapi (1 click)." }; }
}

// 3) Activate their CRM login.
async function agentActivateAccount(acct) {
  store.setActive(acct.username, true);
  return { status: "done", detail: "CRM login is active." };
}

// 4) Welcome + setup pack.
async function agentWelcome(acct, results) {
  const number = (results.find((s) => s.number) || {}).number || "your AI number (being assigned)";
  const dash = process.env.DASHBOARD_URL || "your CRM";
  const body =
    `Welcome to your AI receptionist, ${acct.business}!\n\n` +
    `1. Log into your inbox: ${dash}  (email: ${acct.username})\n` +
    `2. Your AI number: ${number}\n` +
    `3. Forward your calls to it — dial **61*<AI-NUMBER># for "when you don't answer".\n\n` +
    `That's it — it'll answer, book, and text you every lead. — Southline, 085 174 0783`;
  console.log("\n===== WELCOME PACK (" + acct.username + ") =====\n" + body + "\n=================================\n");
  // (Plug in SMTP / Twilio here to actually send it.)
  return { status: "done", detail: "Welcome pack prepared (login + number + forwarding steps)." };
}

// 0) Scan the client's website to auto-fill hours/services/FAQ (like Rosie).
async function agentScanWebsite(acct) {
  if (!acct.website) return { status: "skipped", detail: "No website given — using the details on file." };
  try {
    const k = await require("./knowledge").scanWebsite(acct.website);
    // merge anything useful onto the account so buildAssistant uses it
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

async function runProvisioning(acct) {
  console.log(`🤖 Provisioning started for ${acct.business} (${acct.username})`);
  const steps = [];
  const ctx = {}; // carries assistantId/number between agents
  const order = [
    ["Scan website & build knowledge", agentScanWebsite],
    ["Build AI assistant", agentBuildAssistant],
    ["Assign phone number", agentAssignNumber],
    ["Activate CRM login", agentActivateAccount],
    ["Welcome + setup pack", agentWelcome],
  ];
  for (const [name, fn] of order) {
    console.log(`🤖 Agent → ${name}…`);
    let r;
    try { r = await fn(acct, name === "Assign phone number" ? ctx : steps); }
    catch (e) { r = { status: "error", detail: e.message }; }
    if (r.assistantId) ctx.assistantId = r.assistantId;
    steps.push({ name, status: r.status, detail: r.detail, ...(r.number ? { number: r.number } : {}) });
    console.log(`   ${r.status.toUpperCase()} — ${r.detail}`);
  }
  const status = steps.every((s) => s.status === "done") ? "complete" : "needs_attention";
  store.upsert({ username: acct.username, provisioning: { status, steps, at: new Date().toISOString() } });
  console.log(`🤖 Provisioning ${status} for ${acct.username}`);
  return { status, steps };
}

module.exports = { runProvisioning, _agents: { agentBuildAssistant, agentAssignNumber, agentActivateAccount, agentWelcome }, buildAssistantConfig };
