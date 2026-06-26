/**
 * Per-client accounts & login for the CRM.
 * ----------------------------------------
 * Each client gets a username + password. They log into the SAME dashboard URL
 * and see ONLY their own leads (scoped by their business name on the server —
 * this is the secure part; a login screen alone is not security).
 *
 * Accounts live in the CLIENT_ACCOUNTS env var (JSON array). Create one with:
 *   node scripts/create-client-account.js "joes@plumbing.ie" "Joe's Plumbing" "theirPassword"
 * and paste the printed object into CLIENT_ACCOUNTS.
 *
 * Endpoints added:
 *   POST /login      { username, password }  -> { token, business }
 *   GET  /my-leads   (Authorization: Bearer <token>) -> only that client's leads
 */

const crypto = require("crypto");
const store = require("./store");

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  try {
    const h = crypto.scryptSync(String(password), salt, 32).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
  } catch (e) { return false; }
}

function loadAccounts() {
  // From env (production) …
  if (process.env.CLIENT_ACCOUNTS) {
    try { return JSON.parse(process.env.CLIENT_ACCOUNTS); } catch (e) { console.warn("CLIENT_ACCOUNTS is not valid JSON"); }
  }
  // … else a demo account so the login works out of the box for testing.
  const demo = hashPassword("demo1234");
  return [{ username: "demo@clinic.com", business: "Southline Demo Clinic", salt: demo.salt, hash: demo.hash }];
}

const tokens = new Map(); // token -> { business, exp }
const TOKEN_TTL = 12 * 60 * 60 * 1000;

function issueToken(business) {
  const t = crypto.randomBytes(24).toString("hex");
  tokens.set(t, { business, exp: Date.now() + TOKEN_TTL });
  return t;
}
function readToken(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : (req.query.token || "");
  const rec = tokens.get(t);
  if (!rec) return null;
  if (rec.exp < Date.now()) { tokens.delete(t); return null; }
  return rec;
}

// Look up an account: env accounts (always active) first, then the sign-up store.
function getAccount(envAccounts, username) {
  const u = String(username || "").toLowerCase();
  const env = envAccounts.find((a) => (a.username || "").toLowerCase() === u);
  if (env) return { ...env, active: true };
  return store.find(username) || null;
}

// Mount onto the existing app. getLeads() returns the in-memory leads array.
function mountAuth(app, getLeads) {
  const envAccounts = loadAccounts();

  app.post("/login", (req, res) => {
    const { username, password } = req.body || {};
    const acct = getAccount(envAccounts, username);
    if (!acct || !verifyPassword(password, acct.salt, acct.hash)) {
      return res.status(401).json({ error: "Wrong email or password." });
    }
    if (acct.active === false) {
      return res.status(402).json({ error: "Your subscription isn't active yet — finish payment, then log in." });
    }
    res.json({ token: issueToken(acct.business), business: acct.business });
  });

  app.get("/my-leads", (req, res) => {
    const rec = readToken(req);
    if (!rec) return res.status(401).json({ error: "Please log in again." });
    const all = (getLeads && getLeads()) || [];
    res.json(all.filter((l) => (l.business || "") === rec.business));
  });

  app.get("/me", (req, res) => {
    const rec = readToken(req);
    if (!rec) return res.status(401).json({ error: "not logged in" });
    res.json({ business: rec.business });
  });

  // Provisioning progress for the logged-in client.
  app.get("/setup-status", (req, res) => {
    const rec = readToken(req);
    if (!rec) return res.status(401).json({ error: "not logged in" });
    const acct = (store.read() || []).find((a) => a.business === rec.business);
    res.json({ business: rec.business, provisioning: (acct && acct.provisioning) || { status: "ready", steps: [] } });
  });

  console.log(`Client login mounted (${envAccounts.length} preset account${envAccounts.length === 1 ? "" : "s"} + sign-ups; POST /login, GET /my-leads)`);
}

module.exports = { mountAuth, hashPassword, verifyPassword, _tokens: tokens };
