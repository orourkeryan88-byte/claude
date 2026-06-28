/**
 * Subscription tiers for the AI Receptionist.
 * ------------------------------------------
 * Three levels. Each higher tier unlocks more of the CRM. The dashboard reads
 * the logged-in account's `plan` and shows/hides features from `features` below,
 * so the UI literally gets richer as the client pays more.
 *
 * Pricing is one-time setup + a monthly subscription, in euro.
 * Override any number with env vars (see keys in cents below).
 */

const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    blurb: "Never miss a call. The essentials, done well.",
    setup: parseInt(process.env.STARTER_SETUP_CENTS || "25000", 10) / 100,   // €250
    monthly: parseInt(process.env.STARTER_MONTHLY_CENTS || "8000", 10) / 100, // €80
    features: ["inbox", "appointments", "owner_sms", "call_log"],
    limits: { seats: 1, history_days: 30 },
    highlights: ["24/7 call answering", "Appointment booking", "Text-to-owner on every lead", "30-day call history"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    blurb: "The full front desk — phone, web chat and insights.",
    setup: parseInt(process.env.PRO_SETUP_CENTS || "35000", 10) / 100,    // €350
    monthly: parseInt(process.env.PRO_MONTHLY_CENTS || "15000", 10) / 100, // €150
    features: ["inbox", "appointments", "owner_sms", "call_log", "pipeline", "insights", "copilot", "web_chat", "reminders"],
    limits: { seats: 3, history_days: 365 },
    highlights: ["Everything in Starter", "Website chat widget", "Pipeline board", "AI Insights & Copilot", "Reminders + review follow-ups", "1-year history, 3 seats"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    blurb: "A revenue engine. Analytics, multi-location, priority.",
    setup: parseInt(process.env.PREMIUM_SETUP_CENTS || "50000", 10) / 100,   // €500
    monthly: parseInt(process.env.PREMIUM_MONTHLY_CENTS || "25000", 10) / 100, // €250
    features: ["inbox", "appointments", "owner_sms", "call_log", "pipeline", "insights", "copilot", "web_chat", "reminders", "revenue", "multi_location", "api_access", "priority", "custom_voice"],
    limits: { seats: 10, history_days: 3650 },
    highlights: ["Everything in Pro", "Revenue analytics (€ recovered)", "Multi-location / multi-number", "Custom voice & branding", "API access", "Priority support", "10 seats, unlimited history"],
  },
};

const DEFAULT_PLAN = "pro";

function getPlan(id) {
  return PLANS[String(id || "").toLowerCase()] || PLANS[DEFAULT_PLAN];
}
// Does a plan include a feature?
function hasFeature(planId, feature) {
  return getPlan(planId).features.includes(feature);
}
// Public, ordered list for pricing tables.
function listPlans() {
  return ["starter", "pro", "premium"].map((id) => PLANS[id]);
}

module.exports = { PLANS, DEFAULT_PLAN, getPlan, hasFeature, listPlans };
