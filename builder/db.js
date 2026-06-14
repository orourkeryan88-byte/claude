const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'sites.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  getAll: () => {
    const db = read();
    return Object.values(db)
      .map(({ id, name, trade, created_at, updated_at }) => ({ id, name, trade, created_at, updated_at }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  get: (id) => read()[id] || null,

  create: ({ id, data, html }) => {
    const d = JSON.parse(data);
    const db = read();
    db[id] = {
      id,
      name: d.businessName || 'Untitled',
      trade: d.trade || '',
      data,
      html,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    write(db);
  },

  update: (id, data, html) => {
    const d = JSON.parse(data);
    const db = read();
    if (!db[id]) return;
    db[id] = {
      ...db[id],
      name: d.businessName || 'Untitled',
      trade: d.trade || '',
      data,
      html,
      updated_at: new Date().toISOString(),
    };
    write(db);
  },

  delete: (id) => {
    const db = read();
    delete db[id];
    write(db);
  },
};
