/**
 * Southline AI Receptionist — Lead webhook
 * ----------------------------------------
 * Vapi calls this URL when the assistant runs the `log_lead` function.
 * It texts the business owner the caller's details (via Twilio) and
 * stores a copy. Works for ANY client — the owner's phone is passed in
 * per-assistant metadata, so one server handles all your clients.
 *
 * QUICK START (see SETUP-GUIDE.md for the full walkthrough):
 *   1. cd server && npm install
 *   2. copy .env.example to .env and fill in your Twilio details
 *   3. node log-lead.js
 *   4. expose it with:  npx localtunnel --port 3000   (or deploy to Render/Railway)
 *   5. put that public URL into the assistant's tool "server.url"
 */

const express = require("express");
const app = express();
// Parse JSON for everything EXCEPT the Stripe webhook (which needs the raw body
// for signature verification).
app.use((req, res, next) => {
  if (req.originalUrl === "/stripe-webhook") return next();
  express.json()(req, res, next);
});

// Allow the CRM dashboard (served from another origin) to read /leads and log in.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 3000;

// Optional: Twilio SMS. If creds are missing we just log the lead (great for demos).
let twilio = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn("⚠ twilio package not installed — running in log-only mode. Run `npm install`.");
  }
}

// Optional: Microsoft Teams logging. If a client wants their calls/orders
// posted into a Teams channel, they create an "Incoming Webhook" (via the
// Teams Workflows / Power Automate template "Post to a channel when a webhook
// request is received") and we POST an Adaptive Card to it. The URL can be set
// per-client (assistant metadata `teamsWebhook`) or server-wide (TEAMS_WEBHOOK_URL).
// Best-effort: never blocks or breaks the call if Teams is down or unset.
async function postToTeams(webhookUrl, { title, facts, text }) {
  if (!webhookUrl) return false;
  const body = {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", size: "Medium", weight: "Bolder", text: title, wrap: true },
          ...(facts && facts.length
            ? [{ type: "FactSet", facts: facts.map((f) => ({ title: f.k, value: String(f.v) })) }]
            : []),
          ...(text ? [{ type: "TextBlock", text, wrap: true, isSubtle: true }] : []),
        ],
      },
    }],
  };
  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) { console.warn("Teams post returned", r.status); return false; }
    console.log("🟦 Logged to Microsoft Teams");
    return true;
  } catch (e) { console.warn("Teams post failed:", e.message); return false; }
}

// In-memory store so you can eyeball leads at GET /leads during a demo.
const leads = [];

// --- Spam screening (like Dialzara/Rosie) -----------------------------------
// Flags cold-sales / robocall patterns so they never pollute the client's
// inbox or stats. The assistant also screens verbally; this is the backstop.
const SPAM_PATTERNS = [
  /google (business |my )?(listing|profile|ranking)/i, /seo (service|package|audit)/i,
  /web ?design (service|agency|package)/i, /extended (car )?warranty/i,
  /final notice/i, /you('|)ve been selected/i, /lower your (interest|rate|bill)/i,
  /solar (panel|survey|grant)/i, /debt (relief|consolidation)/i, /crypto|forex/i,
  /this is not a sales call/i, /marketing (agency|service|package)/i,
  /free (audit|consultation) for your business/i, /business loan|merchant (cash|funding)/i,
];
function looksLikeSpam(lead) {
  const t = `${lead.reason || ""} ${lead.name || ""}`;
  return SPAM_PATTERNS.some((re) => re.test(t));
}

app.get("/", (_req, res) => res.send("Southline AI Receptionist webhook is running ✅"));
app.get("/leads", (_req, res) => res.json(leads));

// Appointment booking (Google Calendar) — adds GET /availability and POST /book.
try { require("./calendar").mountCalendar(app); }
catch (e) { console.warn("Calendar module not mounted:", e.message); }

// Per-client login — adds POST /login and GET /my-leads (scoped to the client).
try { require("./auth").mountAuth(app, () => leads); }
catch (e) { console.warn("Auth module not mounted:", e.message); }

// Sign-up + subscription (Stripe) — adds /pricing, /create-checkout-session, /stripe-webhook.
try { require("./billing").mountBilling(app); }
catch (e) { console.warn("Billing module not mounted:", e.message); }

// Knowledge agent — adds POST /scan-website (auto-train from a website).
try { require("./knowledge").mountKnowledge(app); }
catch (e) { console.warn("Knowledge module not mounted:", e.message); }

// Discount codes — adds POST /validate-discount.
try { require("./discounts").mountDiscounts(app); }
catch (e) { console.warn("Discounts module not mounted:", e.message); }

// Owner admin — adds /admin/* (password-protected, owner only).
try { require("./admin").mountAdmin(app, () => leads); }
catch (e) { console.warn("Admin module not mounted:", e.message); }

// Call intelligence — adds POST /call-report (transcripts/summaries/recordings)
// and POST /missed-call (automatic text-back to callers you miss).
try { require("./calls").mountCalls(app, () => leads); }
catch (e) { console.warn("Calls module not mounted:", e.message); }

// Sendable voice demo — talk to the receptionist in the browser, real ElevenLabs voice.
try { require("./demo-voice").mountDemoVoice(app); }
catch (e) { console.warn("Demo voice module not mounted:", e.message); }

app.post("/log-lead", async (req, res) => {
  try {
    // Vapi wraps function calls. Support both the wrapped and flat shapes.
    const msg = req.body?.message || req.body;
    const call = msg?.call || {};
    const args =
      msg?.functionCall?.parameters ||
      msg?.toolCalls?.[0]?.function?.arguments ||
      msg?.tool_calls?.[0]?.function?.arguments ||
      req.body?.parameters ||
      req.body;

    const a = typeof args === "string" ? JSON.parse(args) : args;

    // Per-client config travels on the assistant's metadata.
    const meta = call?.assistant?.metadata || msg?.assistant?.metadata || {};
    const businessName = meta.businessName || "Your business";
    const ownerPhone = meta.ownerPhone || process.env.DEFAULT_OWNER_PHONE;
    const teamsWebhook = meta.teamsWebhook || process.env.TEAMS_WEBHOOK_URL;

    const lead = {
      business: businessName,
      name: a.name || "(no name)",
      phone: a.phone || "(no number)",
      reason: a.reason || "General enquiry",
      urgency: a.urgency || "normal",
      preferred_time: a.preferred_time || "TBC",
      receivedAt: new Date().toISOString(),
    };
    if (looksLikeSpam(lead)) lead.spam = true;
    leads.unshift(lead);

    if (lead.spam) {
      console.log(`🚫 spam screened out (${lead.phone}): ${lead.reason}`);
      return res.json({ result: "Noted. Politely wrap up the call now — this is not a customer enquiry." });
    }

    const flag = lead.urgency === "urgent" ? "⚠ URGENT — " : "";
    const body =
      `🔔 ${flag}NEW LEAD — ${businessName}\n` +
      `Name: ${lead.name}\n` +
      `Phone: ${lead.phone}\n` +
      `Job: ${lead.reason}\n` +
      `When: ${lead.preferred_time}`;

    console.log("\n========== LEAD CAPTURED ==========\n" + body + "\n===================================\n");

    if (twilio && ownerPhone && process.env.TWILIO_FROM_NUMBER) {
      await twilio.messages.create({
        to: ownerPhone,
        from: process.env.TWILIO_FROM_NUMBER,
        body,
      });
      console.log(`📲 SMS sent to owner ${ownerPhone}`);
    } else {
      console.log("ℹ No SMS sent (log-only mode). Add Twilio creds + ownerPhone metadata to enable texts.");
    }

    // Log it into the client's Microsoft Teams channel, if they use one.
    await postToTeams(teamsWebhook, {
      title: `${flag}New ${lead.urgency === "urgent" ? "urgent " : ""}enquiry — ${businessName}`,
      facts: [
        { k: "Name", v: lead.name },
        { k: "Phone", v: lead.phone },
        { k: "Details", v: lead.reason },
        { k: "When", v: lead.preferred_time },
      ],
      text: `Logged by the AI receptionist at ${new Date(lead.receivedAt).toLocaleString("en-IE")}.`,
    });

    // Tell Vapi what the assistant should say next.
    return res.json({
      result: "Lead saved and the team has been notified by text.",
    });
  } catch (err) {
    console.error("Error handling lead:", err);
    return res.status(200).json({ result: "Noted — I've taken your details." });
  }
});

app.listen(PORT, () => {
  console.log(`Southline AI Receptionist webhook listening on :${PORT}`);
  console.log(`Health check:  http://localhost:${PORT}/`);
  console.log(`View leads:    http://localhost:${PORT}/leads`);
});
