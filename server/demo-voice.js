/**
 * Southline — sendable voice demo ("/demo-voice")
 * -----------------------------------------------
 * A shareable web demo: the prospect talks to the AI receptionist in the
 * browser and hears it answer in the REAL ElevenLabs voice. No phone, no
 * Vapi, no Twilio — just this backend.
 *
 *   POST /demo-voice   { messages:[{role,content}] } -> { reply, audio, voice, diag }
 *   GET  /demo-voice/health   -> live check of both keys (open in a browser)
 *
 * Env needed on the server:
 *   ANTHROPIC_API_KEY   (the brain)   ELEVENLABS_API_KEY (the voice)   ELEVENLABS_VOICE_ID (optional)
 */
const AN_KEY = process.env.ANTHROPIC_API_KEY;
const EL_KEY = process.env.ELEVENLABS_API_KEY;
const EL_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (warm female)

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
  "- Reply in 1–2 short, natural spoken sentences. No lists, no markdown — this is read aloud.\n" +
  "- To BOOK: get the caller's name, a phone number, and a preferred day/time. Once you have all three, " +
  "confirm the appointment and give a short reference like SL-4821, and say they'll get a confirmation text.\n" +
  "- Emergencies: reassure and offer the soonest slot today. If unsure, offer to take a message.\n" +
  "- Never invent facts beyond the above. Never say you're an AI. One question at a time.";

// Returns { text, err }.  err is a short human string when the call failed.
async function claudeReply(messages) {
  if (!AN_KEY) return { text: "", err: "no ANTHROPIC_API_KEY on server" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": AN_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 250, system: SYSTEM, messages }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { text: "", err: `Anthropic ${r.status}: ${body.slice(0, 160)}` };
    }
    const data = await r.json();
    return { text: (data.content && data.content[0] && data.content[0].text || "").trim(), err: "" };
  } catch (e) { return { text: "", err: "Anthropic fetch failed: " + e.message }; }
}

// Returns { audio, err }.
async function elevenAudio(text) {
  if (!EL_KEY) return { audio: null, err: "no ELEVENLABS_API_KEY on server" };
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
      method: "POST",
      headers: { "xi-api-key": EL_KEY, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text, model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { audio: null, err: `ElevenLabs ${r.status}: ${body.slice(0, 160)}` };
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return { audio: "data:audio/mpeg;base64," + buf.toString("base64"), err: "" };
  } catch (e) { return { audio: null, err: "ElevenLabs fetch failed: " + e.message }; }
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

      const brain = await claudeReply(messages);
      const reply = brain.text || "Sorry, could you say that once more for me?";
      let audio = null, voice = "none", voiceErr = "";
      if (reply) { const v = await elevenAudio(reply); audio = v.audio; voiceErr = v.err; if (audio) voice = "elevenlabs"; }

      const diag = [brain.err && ("BRAIN: " + brain.err), voiceErr && ("VOICE: " + voiceErr)]
        .filter(Boolean).join(" | ");
      return res.json({ reply, audio, voice, diag });
    } catch (e) {
      console.error("demo-voice error", e);
      return res.json({ reply: "Sorry, could you say that once more for me?", audio: null, voice: "none", diag: "server: " + e.message });
    }
  });

  // Open this in a browser to see exactly what's wrong — no logs needed.
  app.get("/demo-voice/health", async (_req, res) => {
    const out = {
      keys: { anthropic_present: !!AN_KEY, elevenlabs_present: !!EL_KEY },
      voice_id: EL_VOICE, brain: {}, voice: {},
    };
    const b = await claudeReply([{ role: "user", content: "Say hello in three words." }]);
    out.brain = { ok: !!b.text, error: b.err || null, sample: b.text || null };
    const v = await elevenAudio("Hello, this is a test.");
    out.voice = { ok: !!v.audio, error: v.err || null };
    out.verdict = (out.brain.ok && out.voice.ok)
      ? "ALL GOOD — the demo should talk back."
      : "PROBLEM — see brain.error / voice.error above.";
    res.json(out);
  });

  console.log(`Demo voice mounted (/demo-voice; brain ${AN_KEY ? "on" : "OFF"}, ElevenLabs ${EL_KEY ? "on" : "OFF"})`);
}

module.exports = { mountDemoVoice };
