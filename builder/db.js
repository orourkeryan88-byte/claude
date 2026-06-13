const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sites.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT,
    trade TEXT,
    data TEXT,
    html TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = {
  getAll: () =>
    db.prepare('SELECT id, name, trade, created_at, updated_at FROM sites ORDER BY created_at DESC').all(),

  get: (id) =>
    db.prepare('SELECT * FROM sites WHERE id = ?').get(id),

  create: ({ id, data, html }) => {
    const d = JSON.parse(data);
    db.prepare(
      'INSERT INTO sites (id, name, trade, data, html) VALUES (?, ?, ?, ?, ?)'
    ).run(id, d.businessName || 'Untitled', d.trade || '', data, html);
  },

  update: (id, data, html) => {
    const d = JSON.parse(data);
    db.prepare(
      'UPDATE sites SET name=?, trade=?, data=?, html=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run(d.businessName || 'Untitled', d.trade || '', data, html, id);
  },

  delete: (id) =>
    db.prepare('DELETE FROM sites WHERE id = ?').run(id),
};
