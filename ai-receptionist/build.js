#!/usr/bin/env node
/**
 * Build the Southline AI Receptionist.
 * ------------------------------------
 * The in-call WORKFLOW is the backbone: this assembles a complete, deployable
 * Vapi assistant from `vapi/assistant.template.json` (which embeds the workflow
 * system prompt + the 5 tools: log_lead, check_availability, book_appointment,
 * submit_booking, transferCall) by filling in a client profile.
 *
 *   node ai-receptionist/build.js                 # builds the demo clinic
 *   node ai-receptionist/build.js my-client.json  # builds for a real client
 *
 * Output: ai-receptionist/<slug>.assistant.json  -> paste into Vapi
 * (Assistants -> Create -> JSON), or POST to https://api.vapi.ai/assistant.
 */

const fs = require("fs");
const path = require("path");

const DEMO = {
  businessName: "Southline Demo Clinic",
  businessType: "dental & aesthetic clinic",
  area: "Dublin",
  openingHours: "Mon-Fri 9am-6pm, Sat 9am-1pm, closed Sunday.",
  services: "check-ups, cleanings, fillings, whitening, Invisalign, skin consultations, anti-wrinkle, facials",
  pricingNotes: "Check-up & clean 65 euro. New patients welcome. Free Invisalign and skin consultations.",
  faq: "We're on Merrion Road, Ballsbridge, with parking on site. We take card, cash and the main health insurers. New patients very welcome.",
  ownerPhone: "+353851740783",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  webhookBase: "https://YOUR-WEBHOOK-URL",     // your deployed server/log-lead.js base
  bookingWorkflowUrl: ""                          // your booking workflow webhook (optional)
};

function build(profile) {
  const tpl = fs.readFileSync(path.join(__dirname, "..", "vapi", "assistant.template.json"), "utf8");
  const base = (profile.webhookBase || "").replace(/\/$/, "");
  const map = {
    "{{BUSINESS_NAME}}": profile.businessName,
    "{{BUSINESS_TYPE}}": profile.businessType,
    "{{AREA}}": profile.area,
    "{{OPENING_HOURS}}": profile.openingHours,
    "{{SERVICES}}": profile.services,
    "{{PRICING_NOTES}}": profile.pricingNotes,
    "{{FAQ}}": profile.faq || "Ask the team for anything not listed.",
    "{{LANGUAGES}}": profile.languages || "English (switch if the caller speaks another language)",
    "{{VOICE_ID}}": profile.voiceId || "21m00Tcm4TlvDq8ikWAM",
    "{{WEBHOOK_URL}}": base + "/log-lead",
    "{{CALL_REPORT_URL}}": base + "/call-report",
    "{{CANCEL_URL}}": base + "/cancel-booking",
    "{{RESCHEDULE_URL}}": base + "/reschedule-booking",
    "{{AVAILABILITY_URL}}": base + "/availability",
    "{{BOOK_URL}}": base + "/book",
    "{{BOOKING_WORKFLOW_URL}}": profile.bookingWorkflowUrl || base + "/submit-booking",
    "{{TRANSFER_NUMBER}}": profile.transferNumber || profile.ownerPhone
  };
  let raw = tpl;
  for (const [k, v] of Object.entries(map)) raw = raw.split(k).join(String(v).replace(/"/g, '\\"'));
  const a = JSON.parse(raw);
  delete a._comment;
  a.metadata = {
    businessName: profile.businessName,
    ownerPhone: profile.ownerPhone,
    builtBy: "Southline",
    builtAt: new Date().toISOString()
  };
  return a;
}

const arg = process.argv[2];
const profile = arg ? JSON.parse(fs.readFileSync(arg, "utf8")) : DEMO;
const assistant = build(profile);
const slug = profile.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = path.join(__dirname, `${slug}.assistant.json`);
fs.writeFileSync(out, JSON.stringify(assistant, null, 2));

const toolNames = assistant.model.tools.map(t => t.function ? t.function.name : t.type);
console.log(`Built ${profile.businessName} -> ai-receptionist/${slug}.assistant.json`);
console.log(`Model: ${assistant.model.model} | Tools: ${toolNames.join(", ")}`);
console.log(`Voice: ${assistant.voice.provider}/${assistant.voice.voiceId}`);
console.log("Next: paste it into Vapi (Assistants -> Create -> JSON), set your webhook base, attach a number.");
