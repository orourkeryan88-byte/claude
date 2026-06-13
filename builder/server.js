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
