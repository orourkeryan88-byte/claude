/**
 * Southline AI Receptionist — AI backup answer endpoint (SECURE)
 * -------------------------------------------------------------
 * The browser demo can answer common questions on its own. For "answer
 * literally anything", point its AI backup at THIS endpoint instead of
 * putting an Anthropic key in the page. The key stays here on the server.
 *
 * On a real Vapi phone call you don't need this — Claude is already the
 * brain. This is only for the browser demo / a custom front end.
 *
 * USAGE:
 *   1. export ANTHROPIC_API_KEY=sk-ant-...     (from console.anthropic.com)
 *   2. node server/ai-answer.js                (runs on :3100)
 *   3. POST { question, business:{name,type,area,hours,services,pricing} }
 *      -> { answer: "..." }
 */

const express = require("express");
const app = express();
app.use(express.json());

// Allow the demo page to call this from the browser.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 3100;
const KEY = process.env.ANTHROPIC_API_KEY;

app.get("/", (_req, res) => res.send("AI backup endpoint running ✅"));

app.post("/ai-answer", async (req, res) => {
  try {
    const { question, business = {} } = req.body || {};
    if (!question) return res.status(400).json({ error: "missing question" });
    if (!KEY) return res.json({ answer: "" }); // no key -> demo falls back to take-a-message

    const b = business;
    const system =
      `You are the warm, professional phone receptionist for ${b.name || "the business"}, ` +
      `a ${b.type || "business"} based in ${b.area || "the area"}. ` +
      `Opening hours: ${b.hours || "as listed"}. Services: ${b.services || "as listed"}. ` +
      `Pricing: ${b.pricing || "as discussed"}. ` +
      `Answer the caller's question in 1-2 short, natural spoken sentences, as the receptionist. ` +
      `Never invent specific prices, times or facts you weren't given — if you don't know, say you'll ` +
      `have the team confirm and offer to take their details. Do not mention being an AI.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 200,
        system,
        messages: [{ role: "user", content: String(question) }],
      }),
    });

    if (!r.ok) {
      console.error("Anthropic error", r.status, await r.text());
      return res.json({ answer: "" });
    }
    const data = await r.json();
    const answer = (data.content?.[0]?.text || "").trim();
    return res.json({ answer });
  } catch (e) {
    console.error("ai-answer error", e);
    return res.json({ answer: "" });
  }
});

app.listen(PORT, () => console.log(`AI backup endpoint on :${PORT} (key ${KEY ? "set" : "MISSING — log/fallback only"})`));
