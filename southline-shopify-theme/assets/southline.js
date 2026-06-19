/* ─────────────────────────────────────────────
   SOUTHLINE CHATBOT  — edit these two lines only
   ───────────────────────────────────────────── */
const _C = window.SOUTHLINE_CONFIG || {};
const SOUTHLINE_EMAIL    = _C.email    || "orourkeryan88@gmail.com";
const SOUTHLINE_WHATSAPP = _C.whatsapp || "";
const SOUTHLINE_API      = _C.api      || "";
const SOUTHLINE_DEMO1    = _C.demo1    || "#";
const SOUTHLINE_DEMO2    = _C.demo2    || "#";
/* ───────────────────────────────────────────── */

const chatWindow = document.getElementById('chatWindow');
const chatBody   = document.getElementById('chatBody');
const quickWrap  = document.getElementById('quickReplies');
const chatInput  = document.getElementById('chatInput');
const chatBadge  = document.getElementById('chatBadge');
let   greeted    = false;

/* lead-capture state */
const lead = { name:'', trade:'', area:'', phone:'' };
let   capturing = null;   // null | 'name' | 'trade' | 'area' | 'phone' | 'done'

function toggleChat(){
  const open = chatWindow.classList.toggle('open');
  document.getElementById('chatToggle').style.display = open ? 'none' : 'flex';
  if (open){
    chatBadge.style.display = 'none';
    if (!greeted){ greeted = true; greet(); }
    setTimeout(()=>chatInput.focus(), 250);
  }
}
function openChat(){ if(!chatWindow.classList.contains('open')) toggleChat(); }

function addMsg(text, who){
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = text;
  chatBody.appendChild(d);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function showTyping(){
  const t = document.createElement('div');
  t.className = 'typing'; t.id = 'typing';
  t.innerHTML = '<span></span><span></span><span></span>';
  chatBody.appendChild(t);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function hideTyping(){ const t = document.getElementById('typing'); if(t) t.remove(); }

/* bot reply with a realistic typing delay */
function botSay(text, replies){
  showTyping();
  const delay = Math.min(900, 350 + text.length * 9);
  setTimeout(()=>{
    hideTyping();
    addMsg(text, 'bot');
    setQuickReplies(replies || []);
  }, delay);
}

function setQuickReplies(list){
  quickWrap.innerHTML = '';
  list.forEach(q=>{
    const b = document.createElement('button');
    b.className = 'quick-reply';
    b.textContent = q.label;
    b.onclick = ()=>{ addMsg(q.label, 'user'); handle(q.value || q.label); };
    quickWrap.appendChild(b);
  });
}

const DEFAULT_REPLIES = [
  { label:'💶 How much?',        value:'pricing' },
  { label:'📦 What do I get?',   value:'included' },
  { label:'⏱️ How long?',        value:'time' },
  { label:'✅ I want a website', value:'start' },
];

function greet(){
  botSay("Howaya 👋 I'm the Southline assistant.\n\nWe build clean, professional websites for tradesmen — €400 to build, €50/month after. You see it <b>free</b> before paying a cent.\n\nWhat can I help with?", DEFAULT_REPLIES);
}

function sendUserMsg(){
  const txt = chatInput.value.trim();
  if(!txt) return false;
  addMsg(txt, 'user');
  chatInput.value = '';
  handle(txt);
  return false;
}

/* ── core logic ── */
function handle(raw){
  const t = raw.toLowerCase();

  /* lead capture flow takes priority */
  if (capturing){ return captureStep(raw); }

  /* intent: start / sign up */
  if (t==='start' || /\b(want|sign up|get started|interested|yes please|book|sign me)\b/.test(t) || t==='yes'){
    return startCapture();
  }
  /* pricing */
  if (t==='pricing' || /\b(price|cost|how much|fee|expensive|charge|pay|money|€|euro)\b/.test(t)){
    return botSay("Straight pricing, no contracts:\n\n💶 <b>€400</b> once to build &amp; launch your site\n🔁 <b>€50/month</b> for hosting, updates &amp; support\n\nAnd you only pay once you've <b>seen the site and you're happy</b>. Want me to start your free demo?", [
      { label:'✅ Yes, build my demo', value:'start' },
      { label:'📦 What do I get?',     value:'included' },
    ]);
  }
  /* what's included */
  if (t==='included' || /\b(include|get for|what do i|features?|what.?s in)\b/.test(t)){
    return botSay("Every Southline site comes with:\n\n✓ A full custom site built for your trade\n✓ Works perfectly on phones\n✓ One-tap call &amp; email buttons\n✓ Your services, areas covered &amp; reviews\n✓ Hosting, updates &amp; support\n✓ A demo built free before you decide\n\nShall I get yours started?", [
      { label:'✅ Start my demo', value:'start' },
      { label:'💶 Remind me of price', value:'pricing' },
    ]);
  }
  /* time */
  if (t==='time' || /\b(how long|how fast|when|quick|turnaround|days?|ready)\b/.test(t)){
    return botSay("Fast ⚡ — we usually have your <b>demo site ready within 48 hours</b> of you giving us your details. Once you approve it, it goes live the same day.\n\nWant me to take your details now?", [
      { label:'✅ Let\'s do it', value:'start' },
    ]);
  }
  /* examples */
  if (/\b(example|portfolio|see|work|sample|proof|show me)\b/.test(t)){
    return botSay("Have a look at sites we've built for Dublin tradesmen 👇\n\n💧 <a href='" + SOUTHLINE_DEMO1 + "' target='_blank'>Kelly Plumbing</a> — Tallaght plumber\n🔨 <a href='" + SOUTHLINE_DEMO2 + "' target='_blank'>Blackrock Handyman</a>\n\nYours would be built the same way. Ready to start?", [
      { label:'✅ Yes, start mine', value:'start' },
      { label:'💶 How much?',       value:'pricing' },
    ]);
  }
  /* trades / "do you do X" */
  if (/\b(plumb|electric|carpent|paint|roof|build|garden|handyman|plaster|tiler|landscap|gas|mechanic|trade)\b/.test(t)){
    return botSay("Yes — we build sites for <b>every trade</b>: plumbers, electricians, carpenters, painters, roofers, builders, handymen, gardeners and more. Each one is tailored to the job you do.\n\nWant to start your free demo?", [
      { label:'✅ Start my demo', value:'start' },
    ]);
  }
  /* areas */
  if (/\b(area|where|dublin|located|cover|location|county)\b/.test(t)){
    return botSay("We're Dublin-based and work with tradesmen right across the city and county — and the surrounding commuter belt. Wherever you work, we can build for it.\n\nShall I get your demo started?", [
      { label:'✅ Yes please', value:'start' },
    ]);
  }
  /* greetings */
  if (/\b(hi|hey|hello|howaya|how are|good morning|good evening|yo)\b/.test(t)){
    return botSay("Howaya! 👋 Happy to help. Are you a tradesman looking to get online? I can show you pricing, examples, or build you a free demo.", DEFAULT_REPLIES);
  }
  /* thanks */
  if (/\b(thank|thanks|cheers|nice one|grand|sound)\b/.test(t)){
    return botSay("No bother at all 🙂 Want me to start your free demo while you're here?", [
      { label:'✅ Go on then', value:'start' },
      { label:'Not right now', value:'later' },
    ]);
  }
  if (t==='later' || /\b(not now|later|maybe|thinking)\b/.test(t)){
    return botSay("No problem. Whenever you're ready, just drop your details here or email <a href='mailto:"+SOUTHLINE_EMAIL+"'>"+SOUTHLINE_EMAIL+"</a>. 👍", DEFAULT_REPLIES);
  }

  /* fallback */
  return botSay("Good question — I'll make sure Ryan gets back to you on that. In the meantime, the basics: <b>€400</b> to build, <b>€50/month</b> after, and you see it free first.\n\nWhat would you like to do?", DEFAULT_REPLIES);
}

/* ── lead capture flow ── */
function startCapture(){
  capturing = 'name';
  setQuickReplies([]);
  botSay("Brilliant — let's get your free demo started 🙌\n\nFirst up, <b>what's your name?</b>");
}
function captureStep(val){
  val = val.trim();
  if (capturing === 'name'){
    lead.name = val;
    capturing = 'trade';
    return botSay("Nice to meet you, " + escapeHtml(lead.name.split(' ')[0]) + "! 👋\n\nWhat's your <b>trade</b>? (plumber, electrician, etc.)");
  }
  if (capturing === 'trade'){
    lead.trade = val;
    capturing = 'area';
    return botSay("Perfect. And what <b>area(s)</b> do you cover? (e.g. Tallaght, South Dublin)");
  }
  if (capturing === 'area'){
    lead.area = val;
    capturing = 'phone';
    return botSay("Last thing — what's the best <b>phone number</b> to reach you on? We'll send your demo link and give you a quick call.");
  }
  if (capturing === 'phone'){
    lead.phone = val;
    capturing = 'done';
    return finishCapture();
  }
}

/* On a real Shopify storefront, fire Shopify's own native contact-form
   notification straight from the browser — no external backend or API
   keys needed. window.Shopify is injected by every Shopify storefront,
   so this quietly does nothing anywhere else (e.g. this static file). */
function notifyShopify(lead){
  if (typeof window === 'undefined' || !window.Shopify) return;
  try {
    const body = new URLSearchParams({
      form_type: 'contact',
      utf8: '✓',
      'contact[name]': lead.name || '',
      'contact[phone]': lead.phone || '',
      'contact[email]': SOUTHLINE_EMAIL,
      'contact[body]': "New chatbot lead\nTrade: " + lead.trade + "\nArea: " + lead.area + "\nPhone: " + lead.phone,
    });
    fetch(window.location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }).catch(() => {});
  } catch (e) {}
}

async function finishCapture(){
  capturing = null;

  /* build the email / WhatsApp handoff (always available as a backup) */
  const summary =
    "Southline website enquiry%0A%0A" +
    "Name: " + encodeURIComponent(lead.name) + "%0A" +
    "Trade: " + encodeURIComponent(lead.trade) + "%0A" +
    "Area: " + encodeURIComponent(lead.area) + "%0A" +
    "Phone: " + encodeURIComponent(lead.phone);
  const mailto = "mailto:" + SOUTHLINE_EMAIL +
    "?subject=" + encodeURIComponent("New website lead: " + lead.name + " (" + lead.trade + ")") +
    "&body=" + summary;
  let handoff;
  if (SOUTHLINE_WHATSAPP){
    const wa = "https://wa.me/" + SOUTHLINE_WHATSAPP + "?text=" + summary;
    handoff = "<a href='" + wa + "' target='_blank'>📲 Send on WhatsApp</a>  ·  <a href='" + mailto + "'>✉️ Send by email</a>";
  } else {
    handoff = "<a href='" + mailto + "'>✉️ Tap to send us your details</a>";
  }

  const recap =
    "Here's what I've got:\n" +
    "• <b>" + escapeHtml(lead.trade) + "</b> in <b>" + escapeHtml(lead.area) + "</b>\n" +
    "• We'll call you on <b>" + escapeHtml(lead.phone) + "</b>\n\n";

  /* native Shopify notification email — fires automatically, no setup needed */
  notifyShopify(lead);

  /* try to save straight to the Southline backend */
  let saved = false;
  if (SOUTHLINE_API){
    showTyping();
    try {
      const res = await fetch(SOUTHLINE_API.replace(/\/$/, '') + "/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, source: "landing-chatbot" }),
      });
      saved = res.ok;
    } catch (e){ saved = false; }
    hideTyping();
  }

  if (saved){
    botSay(
      "You're all set, " + escapeHtml(lead.name.split(' ')[0]) + "! 🎉 Your details are in — we'll have your demo ready within 48 hours and give you a call.\n\n" + recap +
      "Prefer to message us directly too? " + handoff,
      [{ label:'Start again', value:'restart' }]
    );
  } else {
    botSay(
      "You're all set, " + escapeHtml(lead.name.split(' ')[0]) + "! 🎉\n\n" + recap +
      "Tap below to fire it over to the team and we'll have your demo ready within 48 hours 👇\n\n" + handoff,
      [{ label:'Start again', value:'restart' }]
    );
  }
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* restart hook */
const _handle = handle;
handle = function(raw){
  if (String(raw).toLowerCase() === 'restart'){ capturing = null; greet(); return; }
  return _handle(raw);
};
