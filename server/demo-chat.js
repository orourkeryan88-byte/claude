/**
 * Southline — "Talk to the receptionist" demo endpoint
 * ----------------------------------------------------
 * Powers the live chat in the demo app so a prospect can actually converse
 * with the AI receptionist (type or speak) and watch it book an appointment.
 * Multi-turn: the browser sends the running message history, we reply as the
 * receptionist. The Anthropic key stays on the server — never in the page.
 *
 *   POST /demo-chat  { messages:[{role:'user'|'assistant', content:'…'}] }
 *      -> { reply:"…" }
 *
 * Needs ANTHROPIC_API_KEY set on the server. Without it, returns a friendly
 * notice so the demo still loads.
 */
const KEY = process.env.ANTHROPIC_API_KEY;

// The demo business the receptionist answers for. Concrete details make it feel real.
const SYSTEM =
  "You are Riley, the warm, upbeat phone receptionist for Bright Smile Dental — a busy " +
  "family and cosmetic dental practice in Frisco, Texas. This is a live demo of an AI " +
  "receptionist, so be genuinely helpful and natural.\n\n" +
  "FACTS you may use:\n" +
  "- Hours: Mon–Thu 8am–5pm, Fri 8am–2pm, closed weekends.\n" +
  "- Services: check-ups & cleanings, whitening, Invisalign, crowns, veneers, dental implants, emergencies.\n" +
  "- New-patient check-up & clean is $99. Other prices are quoted after the dentist sees you.\n" +
  "- Address: 3200 Main Street, Frisco. Free parking out front. Most insurance accepted.\n\n" +
  "HOW YOU HELP:\n" +
  "- Answer questions in 1–3 short, natural spoken sentences. Sound like a friendly person, not a script.\n" +
  "- To BOOK: collect the caller's name, a phone number, and a preferred day/time. Once you have all " +
  "three, confirm the appointment back to them and give a short booking reference like SL-4821 " +
  "(make one up, letters+digits). Say they'll get a text to confirm.\n" +
  "- If it's an emergency (pain, swelling, knocked-out tooth), reassure them and offer the soonest slot today.\n" +
  "- If you don't know something, say you'll have the team confirm and offer to take a message.\n" +
  "- Never invent facts beyond what's above. Never say you are an AI or a bot — you're the receptionist.\n" +
  "- Keep it moving toward booking the appointment or taking a message. One question at a time.";

function mountDemoChat(app) {
  app.post("/demo-chat", async (req, res) => {
    try {
      const raw = (req.body && req.body.messages) || [];
      if (!Array.isArray(raw) || !raw.length)
        return res.status(400).json({ error: "messages required" });

      // Keep the last ~20 turns, clamp length, normalise roles.
      const messages = raw.slice(-20).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 1500),
      }));

      if (!KEY)
        return res.json({
          reply:
            "Thanks for calling Bright Smile Dental! (Heads up: the live demo voice isn't switched " +
            "on yet — add an ANTHROPIC_API_KEY on the server to make me fully conversational.)",
        });

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-8",
          max_tokens: 300,
          system: SYSTEM,
          messages,
        }),
      });

      if (!r.ok) {
        console.error("demo-chat anthropic error", r.status, await r.text());
        return res.json({ reply: "Sorry, could you say that once more for me?" });
      }
      const data = await r.json();
      const reply = (data.content && data.content[0] && data.content[0].text || "").trim()
        || "Sorry, could you say that once more for me?";
      return res.json({ reply });
    } catch (e) {
      console.error("demo-chat error", e);
      return res.json({ reply: "Sorry, could you say that once more for me?" });
    }
  });

  console.log(`Demo chat mounted (/demo-chat; ANTHROPIC_API_KEY ${KEY ? "set" : "MISSING — shows setup notice"})`);
}

module.exports = { mountDemoChat };
