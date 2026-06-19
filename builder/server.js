const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const generateSite = require('./generateSite');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Tiny HTML escaper for the leads dashboard
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Email notification on new lead (sent via Resend, https://resend.com) ──
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'agencysouthline@gmail.com';
const NOTIFY_FROM = process.env.NOTIFY_FROM || 'Southline Leads <onboarding@resend.dev>';

async function notifyLead(lead) {
  if (!RESEND_API_KEY) return; // not configured — skip silently
  const html = `
    <p><b>${esc(lead.name)}</b> just completed the Southline chatbot.</p>
    <ul>
      <li><b>Trade:</b> ${esc(lead.trade)}</li>
      <li><b>Area:</b> ${esc(lead.area)}</li>
      <li><b>Phone:</b> <a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a></li>
      <li><b>Source:</b> ${esc(lead.source)}</li>
    </ul>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_EMAIL,
        subject: `New lead: ${lead.name} — ${lead.trade} (${lead.area})`,
        html,
      }),
    });
    if (!res.ok) console.error('Lead notification email failed:', res.status, await res.text());
  } catch (e) {
    console.error('Lead notification email error:', e.message);
  }
}

// ── Southline landing page (served from repo root) ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'southline.html'));
});

// Capture a lead from the landing-page chatbot
app.post('/api/leads', (req, res) => {
  try {
    const { name, phone } = req.body || {};
    if (!name && !phone) return res.status(400).json({ error: 'name or phone required' });
    const lead = db.createLead({ id: uuidv4(), ...req.body });
    console.log(`📥 New lead: ${lead.name} — ${lead.trade} — ${lead.phone}`);
    notifyLead(lead);
    res.json({ ok: true, id: lead.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List captured leads (JSON)
app.get('/api/leads', (req, res) => {
  res.json(db.getLeads());
});

// Simple leads dashboard (HTML)
app.get('/leads', (req, res) => {
  const leads = db.getLeads();
  const rows = leads.map(l => `
    <tr>
      <td>${esc(new Date(l.created_at).toLocaleString('en-IE'))}</td>
      <td><b>${esc(l.name)}</b></td>
      <td>${esc(l.trade)}</td>
      <td>${esc(l.area)}</td>
      <td><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a></td>
      <td>${esc(l.status)}</td>
    </tr>`).join('');
  res.set('Content-Type', 'text/html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Southline — Leads</title>
    <style>
      body{font-family:-apple-system,Segoe UI,sans-serif;background:#0a0a0a;color:#e8e8e8;margin:0;padding:28px}
      h1{color:#00ff88;font-size:1.5rem;margin:0 0 4px} .sub{color:#888;margin-bottom:24px;font-size:.9rem}
      table{width:100%;border-collapse:collapse;font-size:.92rem}
      th,td{text-align:left;padding:11px 14px;border-bottom:1px solid #262626}
      th{color:#00ff88;font-size:.74rem;letter-spacing:1px;text-transform:uppercase}
      tr:hover td{background:#141414} a{color:#7ee787} .empty{color:#555;padding:40px 0;text-align:center}
    </style></head><body>
    <h1>Southline — Leads</h1>
    <div class="sub">${leads.length} enquir${leads.length === 1 ? 'y' : 'ies'} from the website chatbot</div>
    ${leads.length ? `<table><thead><tr><th>When</th><th>Name</th><th>Trade</th><th>Area</th><th>Phone</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No leads yet. They\'ll show up here as the chatbot captures them.</div>'}
  </body></html>`);
});

// Serve generated site HTML
app.get('/preview/:id', (req, res) => {
  const site = db.get(req.params.id);
  if (!site) return res.status(404).send('<h1>Site not found</h1>');
  res.set('Content-Type', 'text/html');
  res.send(site.html);
});

// Generate HTML without saving (live preview)
app.post('/api/generate', (req, res) => {
  try {
    const html = generateSite(req.body);
    res.json({ html });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List all sites
app.get('/api/sites', (req, res) => {
  res.json(db.getAll());
});

// Create site
app.post('/api/sites', (req, res) => {
  try {
    const id = uuidv4();
    const data = req.body;
    const html = generateSite(data);
    db.create({ id, data: JSON.stringify(data), html });
    res.json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single site
app.get('/api/sites/:id', (req, res) => {
  const site = db.get(req.params.id);
  if (!site) return res.status(404).json({ error: 'Not found' });
  res.json({ ...site, data: JSON.parse(site.data) });
});

// Update site
app.put('/api/sites/:id', (req, res) => {
  try {
    const data = req.body;
    const html = generateSite(data);
    db.update(req.params.id, JSON.stringify(data), html);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete site
app.delete('/api/sites/:id', (req, res) => {
  db.delete(req.params.id);
  res.json({ ok: true });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get(/^(?!\/api|\/preview).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 RELIER Builder running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/sites`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   Run client dev server: cd client && npm run dev`);
  }
});
