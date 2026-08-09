/**
 * Call intelligence + missed-call text-back.
 * ------------------------------------------
 * Two endpoints that close the gap with the best products in the market:
 *
 * POST /call-report   Vapi "end-of-call-report" webhook. Attaches the AI call
 *                     summary, full transcript, recording URL and duration to
 *                     the matching lead (same phone, recent) — or logs a new
 *                     entry if the call never produced a log_lead. The CRM
 *                     drawer shows all of it (summary, transcript, playback).
 *
 * POST /missed-call   Missed-call text-back (recovers 30–58% of leads that
 *                     would ring a competitor). Wire it to Twilio's "call
 *                     status" webhook (form-encoded) or call it yourself with
 *                     JSON { phone, business }. If Twilio creds are set it
 *                     texts the caller back within seconds and logs a lead;
 *                     otherwise it logs the lead so nothing is lost.
 */
const express = require("express");

const norm = (p) => String(p || "").replace(/[^\d+]/g, "");

function twilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  try { return require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN); }
  catch (e) { return null; }
}

function mountCalls(app, getLeads) {
  // --- Vapi end-of-call report -> transcript, summary, recording on the lead ---
  app.post("/call-report", (req, res) => {
    try {
      const msg = req.body?.message || req.body || {};
      if (msg.type && msg.type !== "end-of-call-report") return res.json({ ok: true, ignored: msg.type });

      const call = msg.call || {};
      const artifact = msg.artifact || {};
      const phone = call.customer?.number || msg.customer?.number || "";
      const report = {
        summary: msg.analysis?.summary || msg.summary || "",
        transcript: msg.transcript || artifact.transcript || "",
        recordingUrl: msg.recordingUrl || artifact.recordingUrl || artifact.recording?.url || "",
        endedReason: msg.endedReason || "",
        durationSeconds: Math.round(msg.durationSeconds || msg.durationMs / 1000 || 0) || undefined,
        reportedAt: new Date().toISOString(),
      };

      const leads = (getLeads && getLeads()) || [];
      // Match the most recent lead from the same number in the last 30 minutes.
      const cutoff = Date.now() - 30 * 60 * 1000;
      const match = leads.find((l) =>
        norm(l.phone) && norm(l.phone) === norm(phone) &&
        Date.parse(l.receivedAt || 0) > cutoff);

      if (match) {
        Object.assign(match, report);
        console.log(`📼 call report attached to lead (${match.name} · ${phone})`);
      } else {
        const meta = call.assistant?.metadata || msg.assistant?.metadata || {};
        leads.unshift({
          business: meta.businessName || "Your business",
          name: "(from call report)",
          phone: phone || "(no number)",
          reason: report.summary ? report.summary.slice(0, 140) : "Call ended — see transcript",
          urgency: "normal",
          preferred_time: "TBC",
          receivedAt: new Date().toISOString(),
          ...report,
        });
        console.log(`📼 call report logged as new lead (${phone || "unknown number"})`);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error("call-report error:", e.message);
      res.status(200).json({ ok: false });
    }
  });

  // --- Missed-call text-back ---
  app.post("/missed-call", express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const b = req.body || {};
      // Twilio status callback sends From/To/CallStatus; JSON callers send phone/business.
      const status = (b.CallStatus || b.status || "").toLowerCase();
      const isMiss = !status || ["no-answer", "busy", "failed", "missed"].includes(status);
      if (!isMiss) return res.json({ ok: true, ignored: status });

      const phone = b.phone || b.From || "";
      const business = b.business || process.env.BUSINESS_NAME || "the team";
      if (!phone) return res.status(400).json({ error: "no caller number" });

      const text = b.text ||
        `Sorry we missed your call — this is ${business}. Reply here with what you need (or a good time to call) and we'll come straight back to you.`;

      let sent = false;
      const tw = twilioClient();
      if (tw && process.env.TWILIO_FROM_NUMBER) {
        await tw.messages.create({ to: phone, from: process.env.TWILIO_FROM_NUMBER, body: text });
        sent = true;
        console.log(`📲 missed-call text-back sent to ${phone}`);
      } else {
        console.log(`ℹ missed call from ${phone} — text-back queued (no Twilio creds)`);
      }

      const leads = (getLeads && getLeads()) || [];
      leads.unshift({
        business,
        name: "Missed call",
        phone,
        reason: sent ? "Missed call — text-back sent automatically" : "Missed call — needs a call back",
        urgency: "normal",
        preferred_time: "ASAP",
        channel: "missed-call",
        receivedAt: new Date().toISOString(),
      });
      res.json({ ok: true, textBack: sent });
    } catch (e) {
      console.error("missed-call error:", e.message);
      res.status(200).json({ ok: false });
    }
  });

  console.log("Call intelligence mounted (POST /call-report, POST /missed-call text-back)");
}

module.exports = { mountCalls };
