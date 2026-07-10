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

// The demo personalizes per prospect: the page passes ?biz=Name&type=medspa
// through in the POST body, and Riley answers as THAT business. With no
// params it stays the original Bright Smile Dental demo.
function cleanBiz(raw) {
  const b = String(raw || "").replace(/[^\w\s&'.,\-]/g, "").trim().slice(0, 60);
  return b || null;
}

const TYPE_PROFILES = {
  dental: {
    what: "a busy family and cosmetic dental practice",
    facts:
      "- Hours: Mon–Thu 8am–5pm, Fri 8am–2pm, closed weekends.\n" +
      "- Services: check-ups & cleanings, whitening, Invisalign, crowns, veneers, dental implants, emergencies.\n" +
      "- New-patient check-up & clean is $99. Other prices are quoted after the dentist sees you.\n" +
      "- Free parking. Most insurance accepted. If asked the address, say you'll text it with the confirmation.\n",
    extra: "- Emergencies: reassure and offer the soonest slot today.\n",
  },
  medspa: {
    what: "a premier med spa",
    facts:
      "- Hours: Mon–Sat 9am–6pm, closed Sundays.\n" +
      "- Services: Botox and Dysport, dermal fillers, facials and HydraFacial, laser treatments, skin tightening, body contouring.\n" +
      "- Consultations are free. Exact pricing is confirmed at the consult because every treatment plan is personalized.\n" +
      "- If asked the address, say you'll text the exact address and parking details with their confirmation.\n",
    extra: "- If a caller wonders whether a treatment suits them, reassure them and book the free consult — the provider tailors everything in person.\n",
  },
  salon: {
    what: "a busy hair and beauty salon",
    facts:
      "- Hours: Tue–Sat 9am–7pm, closed Sunday and Monday.\n" +
      "- Services: cuts, color and balayage, blowouts, styling and treatments.\n" +
      "- Pricing depends on the stylist and service; it's confirmed when booking.\n" +
      "- If asked the address, say you'll text it with their confirmation.\n",
    extra: "",
  },
  tattoo: {
    what: "a custom tattoo studio",
    facts:
      "- Hours: Mon–Sat 11am–7pm.\n" +
      "- Custom work is by appointment; walk-ins welcome when an artist is free.\n" +
      "- Pricing depends on size and design — the artist confirms a quote at a free consult, and a deposit secures the booking.\n" +
      "- If asked the address, say you'll text it with their confirmation.\n",
    extra: "",
  },
  service: {
    what: "a trusted local service business",
    facts:
      "- Hours: Mon–Fri 8am–6pm, with emergency callouts available.\n" +
      "- Quotes are free; exact pricing is confirmed once the details are taken.\n" +
      "- If asked the address or service area, say you'll confirm the details by text.\n",
    extra: "- Urgent jobs: reassure the caller and take their details for the soonest callout.\n",
  },
};

function buildSystem(biz, type) {
  const p = TYPE_PROFILES[type] || TYPE_PROFILES.dental;
  const name = biz || "Bright Smile Dental";
  const what = biz ? p.what : "a busy family and cosmetic dental practice in Frisco, Texas";
  return (
    `You are Riley, the warm, upbeat phone receptionist for ${name} — ${what}. ` +
    "This is a live demo, so be genuinely helpful and sound like a real person on the phone.\n\n" +
    "FACTS you may use:\n" + p.facts + "\n" +
    "HOW YOU HELP:\n" +
    "- Reply in 1–2 short, natural spoken sentences. No lists, no markdown — this is read aloud.\n" +
    "- To BOOK: get the caller's name, a phone number, and a preferred day/time. Once you have all three, " +
    "confirm the appointment and give a short reference like SL-4821, and say they'll get a confirmation text.\n" +
    p.extra +
    "- Never invent facts beyond the above. Never say you're an AI. One question at a time."
  );
}

// Returns { text, err }.  err is a short human string when the call failed.
async function claudeReply(messages, system) {
  if (!AN_KEY) return { text: "", err: "no ANTHROPIC_API_KEY on server" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": AN_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 250, system: system || buildSystem(null, "dental"), messages }),
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
const SCRIPT_LINES = {
  dental: {
    hours: "We're open Monday through Thursday 8 to 5, and Fridays 8 to 2. Would you like me to book you in?",
    price: "A new-patient check-up and clean is $99, and anything else the dentist quotes after they see you. Want me to get you scheduled?",
    services: "We do check-ups and cleanings, whitening, Invisalign, crowns, veneers and implants. Would you like to book in for any of those?",
    urgent: "Oh no — that sounds like it needs to be seen today. I can get you in this afternoon. What's your name and a good number, and I'll lock in the soonest slot?",
  },
  medspa: {
    hours: "We're open Monday through Saturday, 9 to 6. Would you like me to book you in for a free consultation?",
    price: "Consultations are free, and exact pricing is confirmed there since every treatment plan is personalized. Want me to grab you a spot?",
    services: "We do Botox and fillers, facials and HydraFacial, laser treatments, skin tightening and body contouring. Would you like to book a free consult for any of those?",
    urgent: "Of course — let me get you in as soon as possible. What's your name and a good number, and I'll lock in the soonest opening?",
  },
  salon: {
    hours: "We're open Tuesday through Saturday, 9 to 7. Would you like me to book you in?",
    price: "Pricing depends on the stylist and service, and we confirm it when booking. Want me to get you in the chair?",
    services: "We do cuts, color and balayage, blowouts, styling and treatments. Which would you like to book?",
    urgent: "Let me see what we can do — what's your name and a good number, and I'll find you the soonest opening?",
  },
  tattoo: {
    hours: "We're open Monday through Saturday, 11 to 7. Want me to set up a free consult with one of the artists?",
    price: "It depends on the size and design — the artist confirms a quote at a free consult, and a deposit locks in your session. Want me to set that up?",
    services: "All custom work — the artist designs it with you at a free consult. Want me to book you one?",
    urgent: "Let me check the walk-in availability — what's your name and a good number, and I'll get you the soonest opening?",
  },
  service: {
    hours: "We're available Monday through Friday, 8 to 6, with emergency callouts too. Want me to book you in?",
    price: "Quotes are free — we confirm exact pricing once we have the details of the job. Want me to take those down?",
    services: "Tell me a bit about the job and I'll get the right person out to you. What needs doing?",
    urgent: "That sounds urgent — I can get someone out to you as soon as possible. What's your name and a good number?",
  },
};

function scriptedReply(messages, type) {
  const L = SCRIPT_LINES[type] || SCRIPT_LINES.dental;
  const users = messages.filter((m) => m.role === "user");
  const last = (users[users.length - 1] || {}).content || "";
  const t = last.toLowerCase();
  const convo = users.map((m) => m.content).join(" ");
  const hasPhone = /(\+?\d[\s().-]?){10,}/.test(convo);
  const booking = /\b(book|appointment|schedule|come in|slot|set (it|me) up|reserve|consult)\b/i;
  const ref = "SL-" + Math.floor(1000 + Math.random() * 9000);

  if (/(emergency|urgent|asap|right away|pain|hurt|ache|aching|toothache|swollen|swelling|broke|broken|knocked|bleeding|chipped|killing|sore)/.test(t))
    return L.urgent;
  if (/(hours?|what time|when.*(open|close)|you open|you close|opening|closing)/.test(t))
    return L.hours;
  if (/\b(price|cost|how much|fee|charge|\$)\b/.test(t))
    return L.price;
  if (/\b(where|address|located|location|parking|directions)\b/.test(t))
    return "I'll text you the exact address and parking details with your confirmation — we're easy to find. Shall I book you in?";
  if (/\b(insurance|insured|cover)\b/.test(t))
    return "I can check that for you when you come in — would you like to book a visit?";
  if (/\b(service|offer|do you do|whiten|implant|invisalign|clean|check ?up|veneer|crown|braces|botox|filler|facial|laser|balayage|color|cut|tattoo|piercing)\b/.test(t))
    return L.services;
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

      // Per-prospect personalization (optional): { biz: "Glow Med Spa", type: "medspa" }
      const biz = cleanBiz(req.body && req.body.biz);
      const type = TYPE_PROFILES[req.body && req.body.type] ? req.body.type : (biz ? "medspa" : "dental");

      const brain = await claudeReply(messages, buildSystem(biz, type));
      // If the AI brain is down (no/invalid key), fall back to the scripted brain
      // so the demo still talks and books.
      const reply = brain.text || scriptedReply(messages, type);
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
