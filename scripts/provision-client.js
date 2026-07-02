#!/usr/bin/env node
/**
 * Southline AI Receptionist — one-command client provisioner
 * ----------------------------------------------------------
 * Takes a small client profile, fills in the assistant template, and
 * creates a live Vapi assistant for that client. This is how you onboard
 * a new customer in ~10 seconds instead of editing JSON by hand.
 *
 * USAGE:
 *   1. export VAPI_PRIVATE_KEY=your_vapi_private_key   (from dashboard.vapi.ai > API Keys)
 *   2. Edit the CLIENT object below (or pass a JSON file: node provision-client.js client.json)
 *   3. node scripts/provision-client.js
 *
 * It prints the new assistant's ID. Attach a phone number to it in the
 * Vapi dashboard (or via the API) and you're live.
 */

const fs = require("fs");
const path = require("path");

// ---- 1. The client profile. Edit this, or load from a file. ----
const DEFAULT_CLIENT = {
  businessName: "Joe's Plumbing",
  businessType: "plumbing and heating company",
  area: "Dublin",
  openingHours: "Mon-Fri 8am-6pm, Sat 9am-1pm, closed Sunday. Emergency call-outs 24/7.",
  services: "leak repairs, boiler servicing, bathroom installs, blocked drains, heating",
  pricingNotes: "Standard call-out 80 euro, emergency 150 euro. Free quotes for bigger jobs.",
  faq: "Yes we cover all of Dublin city and south county. We take card and cash. We can usually get someone out same or next day. Free parking at our yard.",
  ownerPhone: "+353851740783",          // where leads get texted
  voiceId: "21m00Tcm4TlvDq8ikWAM",       // ElevenLabs voice id (warm female default)
  webhookUrl: "https://your-webhook.example.com/log-lead",
};

function buildAssistant(c) {
  const tplPath = path.join(__dirname, "..", "vapi", "assistant.template.json");
  let raw = fs.readFileSync(tplPath, "utf8");

  const base = (c.webhookUrl || "").replace(/\/log-lead\/?$/, "");
  const replacements = {
    "{{BUSINESS_NAME}}": c.businessName,
    "{{BUSINESS_TYPE}}": c.businessType,
    "{{AREA}}": c.area,
    "{{OPENING_HOURS}}": c.openingHours,
    "{{SERVICES}}": c.services,
    "{{PRICING_NOTES}}": c.pricingNotes,
    "{{FAQ}}": c.faq || "Ask the team for anything not listed.",
    "{{LANGUAGES}}": c.languages || "English (switch if the caller speaks another language)",
    "{{VOICE_ID}}": c.voiceId,
    "{{WEBHOOK_URL}}": c.webhookUrl,
    "{{CALL_REPORT_URL}}": String(c.webhookUrl||"").replace(/\/log-lead$/,"") + "/call-report",
    "{{AVAILABILITY_URL}}": base + "/availability",
    "{{BOOK_URL}}": base + "/book",
    "{{BOOKING_WORKFLOW_URL}}": c.bookingWorkflowUrl || base + "/submit-booking",
    "{{TRANSFER_NUMBER}}": c.transferNumber || c.ownerPhone,
  };
  for (const [k, v] of Object.entries(replacements)) {
    raw = raw.split(k).join(String(v).replace(/"/g, '\\"'));
  }

  const assistant = JSON.parse(raw);
  delete assistant._comment;

  // Attach per-client metadata so the shared webhook knows who to text.
  assistant.metadata = {
    businessName: c.businessName,
    ownerPhone: c.ownerPhone,
    provisionedBy: "Southline",
    provisionedAt: new Date().toISOString(),
  };
  return assistant;
}

async function main() {
  const fileArg = process.argv[2];
  const client = fileArg
    ? JSON.parse(fs.readFileSync(fileArg, "utf8"))
    : DEFAULT_CLIENT;

  const assistant = buildAssistant(client);

  // Save a local copy you can keep / send to the client.
  const outDir = path.join(__dirname, "..", "clients");
  fs.mkdirSync(outDir, { recursive: true });
  const slug = client.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const outFile = path.join(outDir, `${slug}.json`);
  fs.writeFileSync(outFile, JSON.stringify(assistant, null, 2));
  console.log(`📝 Saved client config -> clients/${slug}.json`);

  const key = process.env.VAPI_PRIVATE_KEY;
  if (!key) {
    console.log("\nℹ No VAPI_PRIVATE_KEY set — generated the config but did not deploy.");
    console.log("   To go live: export VAPI_PRIVATE_KEY=... then run again, OR paste the");
    console.log(`   saved file into the Vapi dashboard (Assistants > Create > JSON).`);
    return;
  }

  console.log("🚀 Creating assistant in Vapi…");
  const resp = await fetch("https://api.vapi.ai/assistant", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(assistant),
  });

  if (!resp.ok) {
    console.error(`❌ Vapi returned ${resp.status}: ${await resp.text()}`);
    process.exit(1);
  }
  const data = await resp.json();
  console.log(`✅ Live! Assistant ID: ${data.id}`);
  console.log(`   Next: attach a phone number to this assistant in the Vapi dashboard,`);
  console.log(`   then have ${client.businessName} forward their calls to it.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
