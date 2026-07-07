/**
 * One plan. $350 setup + $150/month. Everything included.
 * ------------------------------------------------------
 * No tiers, no gating — every client gets the full product. The features
 * list is what the product genuinely does today (nothing aspirational).
 *
 * Price overrides: SETUP_FEE_CENTS (default 35000), MONTHLY_FEE_CENTS (15000).
 *
 * getPlan()/hasFeature()/listPlans() keep the same shape as before so the
 * dashboard, billing and admin code work unchanged.
 */

const PLAN = {
  id: "complete",
  name: "AI Receptionist",
  blurb: "Everything included. One price, no tiers.",
  setup: parseInt(process.env.SETUP_FEE_CENTS || "35000", 10) / 100,    // $350
  monthly: parseInt(process.env.MONTHLY_FEE_CENTS || "15000", 10) / 100, // $150
  features: ["inbox", "appointments", "owner_sms", "call_log", "pipeline",
    "insights", "copilot", "web_chat", "reminders", "revenue"],
  limits: { seats: 3, history_days: 365 },
  highlights: [
    "24/7 call answering in your business's name",
    "Books appointments into Google Calendar",
    "Every lead texted to you instantly",
    "Missed-call text-back",
    "Call summaries, transcripts & recordings",
    "Spam & sales-call screening",
    "Website chat widget",
    "CRM app on your phone — pipeline, insights, revenue",
  ],
};

const DEFAULT_PLAN = "complete";

function getPlan(_id) { return PLAN; }
function hasFeature(_planId, feature) { return PLAN.features.includes(feature); }
function listPlans() { return [PLAN]; }

module.exports = { PLANS: { complete: PLAN }, DEFAULT_PLAN, getPlan, hasFeature, listPlans };
