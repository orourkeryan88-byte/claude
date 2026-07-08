/**
 * Southline — sendable voice demo ("/demo-voice")
 * -----------------------------------------------
 * A shareable web demo: the prospect talks to the AI receptionist in the
 * browser and hears it answer in the REAL ElevenLabs voice. No phone, no
 * Vapi, no Twilio — just this backend.
 *
 * Flow per turn:  browser sends running transcript -> Claude writes the
 * receptionist's reply -> ElevenLabs speaks it -> we return { reply, audio }.
 *
 *   POST /demo-voice { messages:[{role,content}] }
 *      -> { reply:"…", audio:"data:audio/mpeg;base64,…"|null, voice:"elevenlabs"|"none" }
 *
 * Env needed on the server:
 *   ANTHROPIC_API_KEY     (the brain)      — required for replies
 *   ELEVENLABS_API_KEY    (the voice)      — required for the ElevenLabs audio
 *   ELEVENLABS_VOICE_ID   (optional)       — defaults to "Rachel"
 */
const AN_KEY = process.env.ANTHROPIC_API_KEY;
const EL_KEY = process.env.ELEVENLABS_API_KEY;
const EL_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel

const SYSTEM =
  "You are Riley, the warm, upbeat phone receptionist for Bright Smile Dental — a busy " +
  "family and cosmetic dental practice in Frisco, Texas. This is a live demo, so be genuinely " +
  "helpful and sound like a real person on the phone.\n\n" +
  "FACTS you may use:\n" +
  "- Hours: Mon–Thu 8am–5pm, Fri 8am–2pm, closed weekends.\n" +
  "- Services: check-ups & cleanings, whitening, Invisalign, crowns, veneers, dental implants, emergencies.\n" +
  "- New-patient check-up & clean is $99. Other prices are quoted after the dentist sees you.\n" +
  "- Address: 3200 Main Street, Frisco. Free parking. Most insurance accepted.\n\n" +
  "HOW YOU HELP:\n" +
  "- Reply in 1–2 short, natural spoken sentences. No lists, no markdown — this will be read aloud.\n" +
  "- To BOOK: get the caller's name, a phone number, and a preferred day/time. Once you have all three, " +
  "confirm the appointment and give a short reference like SL-4821, and say they'll get a confirmation text.\n" +
  "- Emergencies (pain, swelling, knocked-out tooth): reassure and offer the soonest slot today.\n" +
  "- If unsure, say you'll have the team confirm and offer to take a message.\n" +
  "- Never invent facts beyond the above. Never say you're an AI — you're the receptionist. One question at a time.";

async function claudeReply(messages) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": AN_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 250, system: SYSTEM, messages }),
  });
  if (!r.ok) { console.error("demo-voice claude", r.status, await r.text()); return ""; }
  const data = await r.json();
  return (data.content && data.content[0] && data.content[0].text || "").trim();
}

async function elevenAudio(text) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": EL_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!r.ok) { console.error("demo-voice elevenlabs", r.status, await r.text().catch(() => "")); return null; }
  const buf = Buffer.from(await r.arrayBuffer());
  return "data:audio/mpeg;base64," + buf.toString("base64");
}

function mountDemoVoice(app) {
  app.post("/demo-voice", async (req, res) => {
    try {
      const raw = (req.body && req.body.messages) || [];
      if (!Array.isArray(raw) || !raw.length) return res.status(400).json({ error: "messages required" });
      const messages = raw.slice(-20).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 1500),
      }));

      if (!AN_KEY)
        return res.json({ reply: "Thanks for calling Bright Smile Dental! (The demo brain isn't switched on yet — add ANTHROPIC_API_KEY on the server.)", audio: null, voice: "none" });

      const reply = (await claudeReply(messages)) || "Sorry, could you say that once more for me?";
      let audio = null, voice = "none";
      if (EL_KEY) { audio = await elevenAudio(reply); if (audio) voice = "elevenlabs"; }
      return res.json({ reply, audio, voice });
    } catch (e) {
      console.error("demo-voice error", e);
      return res.json({ reply: "Sorry, could you say that once more for me?", audio: null, voice: "none" });
    }
  });
  console.log(`Demo voice mounted (/demo-voice; brain ${AN_KEY ? "on" : "OFF"}, ElevenLabs ${EL_KEY ? "on" : "OFF"})`);
}

module.exports = { mountDemoVoice };
