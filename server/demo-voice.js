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
        text,
        // multilingual_v2 = ElevenLabs' most natural/human model (worth the small
        // extra latency for a demo). Settings tuned for a warm, conversational tone.
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
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

// Backup brain — a rule-based receptionist so the demo works even with NO
// Anthropic key. Answers common questions and books in two steps.
function scriptedReply(messages) {
  const users = messages.filter((m) => m.role === "user");
  const last = (users[users.length - 1] || {}).content || "";
  const t = last.toLowerCase();
  const convo = users.map((m) => m.content).join(" ");
  const hasPhone = /(\+?\d[\s().-]?){10,}/.test(convo);
  const booking = /\b(book|appointment|schedule|come in|slot|set (it|me) up|reserve)\b/i;
  const ref = "SL-" + Math.floor(1000 + Math.random() * 9000);

  if (/(emergency|pain|hurt|ache|aching|toothache|swollen|swelling|broke|broken|knocked|bleeding|chipped|killing|sore)/.test(t))
    return "Oh no — that sounds like it needs to be seen today. I can get you in this afternoon. What's your name and a good number, and I'll lock in the soonest slot?";
  if (/(hours?|what time|when.*(open|close)|you open|you close|opening|closing)/.test(t))
    return "We're open Monday through Thursday 8 to 5, and Fridays 8 to 2. Would you like me to book you in?";
  if (/\b(price|cost|how much|fee|charge|\$)\b/.test(t))
    return "A new-patient check-up and clean is $99, and anything else the dentist quotes after they see you. Want me to get you scheduled?";
  if (/\b(where|address|located|location|parking|directions)\b/.test(t))
    return "We're at 3200 Main Street in Frisco, with free parking right out front. Shall I book you an appointment?";
  if (/\b(insurance|insured|cover)\b/.test(t))
    return "Yes, we take most insurance. I can check yours when you come in — would you like to book a visit?";
  if (/\b(service|offer|do you do|whiten|implant|invisalign|clean|check ?up|veneer|crown|braces)\b/.test(t))
    return "We do check-ups and cleanings, whitening, Invisalign, crowns, veneers and implants. Would you like to book in for any of those?";
  if (hasPhone)
    return `Perfect — you're all set. Your booking reference is ${ref}, and you'll get a confirmation text shortly. Is there anything else I can help you with?`;
  if (booking.test(convo))
    return "I'd be happy to book you in! What day and time works best, and can I grab your name and a good phone number?";
  if (/\b(hi|hello|hey|good (morning|afternoon|evening)|how are you)\b/.test(t))
    return "Hi there! I can book you an appointment or answer anything about our hours, services or pricing — what can I do for you?";
  return "I can help you book an appointment, or answer questions about our hours, services or pricing. What would you like to do?";
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
      // If the AI brain is down (no/invalid key), fall back to the scripted brain
      // so the demo still talks and books.
      const reply = brain.text || scriptedReply(messages);
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
