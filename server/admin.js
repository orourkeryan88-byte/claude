/**
 * Owner admin API (Ryan only).
 * ----------------------------
 * Everything the business owner needs to run the whole product from one place:
 * see every client, change anyone's plan, suspend/activate, read every lead,
 * create discount codes (global or per-customer), and edit the product's
 * pricing / settings.
 *
 * Protected by a single admin password (env ADMIN_PASSWORD). This is separate
 * from client logins — clients can NEVER reach these routes.
 *
 *   POST /admin/login            { password } -> { token }
 *   GET  /admin/overview         stats across all clients
 *   GET  /admin/clients          every account
 *   POST /admin/client/update    { email, plan?, active?, business?, ownerPhone?, notes? }
 *   GET  /admin/leads            every lead, all clients
 *   GET  /admin/discounts        list codes
 *   POST /admin/discounts        create/update a code
 *   POST /admin/discounts/delete { code }
 *   GET  /admin/product          product config (pricing, plans)
 *   POST /admin/product          save product config
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const store = require("./store");
const discounts = require("./discounts");
const plans = require("./plans");

const CONFIG_FILE = process.env.PRODUCT_CONFIG_FILE || path.join(__dirname, "product-config.json");
const tokens = new Map(); // token -> exp
const TTL = 8 * 60 * 60 * 1000;

function adminPassword() { return process.env.ADMIN_PASSWORD || "southline-admin"; }
function adminEmail() { return (process.env.ADMIN_EMAIL || "agencysouthline@gmail.com").toLowerCase(); }
function issue() { const t = crypto.randomBytes(24).toString("hex"); tokens.set(t, Date.now() + TTL); return t; }
function ok(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : (req.query.token || "");
  const exp = tokens.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}
function guard(req, res, next) { if (!ok(req)) return res.status(401).json({ error: "Admin login required." }); next(); }

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch (e) { return {}; }
}
function writeConfig(c) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2)); return true; }
  catch (e) { console.warn("product config write failed:", e.message); return false; }
}

function mountAdmin(app, getLeads) {
  app.post("/admin/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || String(email).toLowerCase() !== adminEmail())
      return res.status(401).json({ error: "Wrong admin email or password." });
    if (!password || password !== adminPassword())
      return res.status(401).json({ error: "Wrong admin email or password." });
    res.json({ token: issue(), email: adminEmail() });
  });

  app.get("/admin/overview", guard, (req, res) => {
    const accts = store.read() || [];
    const leads = (getLeads && getLeads()) || [];
    const active = accts.filter((a) => a.active);
    const mrr = active.reduce((s, a) => s + plans.getPlan(a.plan).monthly, 0);
    const byPlan = {};
    for (const a of active) { const p = plans.getPlan(a.plan).id; byPlan[p] = (byPlan[p] || 0) + 1; }
    res.json({
      clients: accts.length,
      activeClients: active.length,
      pendingClients: accts.filter((a) => !a.active).length,
      mrr, arr: mrr * 12,
      leadsTotal: leads.length,
      byPlan,
      discounts: discounts.read().length,
    });
  });

  app.get("/admin/clients", guard, (req, res) => {
    const accts = (store.read() || []).map((a) => ({
      username: a.username, business: a.business, plan: plans.getPlan(a.plan).id,
      planName: plans.getPlan(a.plan).name, active: !!a.active, website: a.website || "",
      ownerPhone: a.ownerPhone || "", createdAt: a.createdAt || "", notes: a.notes || "",
      provisioning: a.provisioning || null,
    }));
    res.json(accts);
  });

  app.post("/admin/client/update", guard, (req, res) => {
    const { email, plan, active, business, ownerPhone, notes } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });
    const patch = { username: email };
    if (plan !== undefined) patch.plan = plans.getPlan(plan).id;
    if (active !== undefined) patch.active = !!active;
    if (business !== undefined) patch.business = business;
    if (ownerPhone !== undefined) patch.ownerPhone = ownerPhone;
    if (notes !== undefined) patch.notes = notes;
    const saved = store.upsert(patch);
    res.json({ ok: true, client: saved });
  });

  app.get("/admin/leads", guard, (req, res) => {
    res.json((getLeads && getLeads()) || []);
  });

  app.get("/admin/discounts", guard, (req, res) => res.json(discounts.read()));
  app.post("/admin/discounts", guard, (req, res) => {
    const { code, type, amount, applies, email, maxUses, expires, note, active } = req.body || {};
    if (!code || amount == null) return res.status(400).json({ error: "code and amount required" });
    const rec = discounts.upsert({ code, type, amount: Number(amount), applies, email, maxUses: maxUses ? Number(maxUses) : undefined, expires, note, active });
    res.json({ ok: true, discount: rec });
  });
  app.post("/admin/discounts/delete", guard, (req, res) => {
    const { code } = req.body || {};
    discounts.remove(code);
    res.json({ ok: true });
  });

  app.get("/admin/product", guard, (req, res) => {
    res.json({ plans: plans.listPlans(), config: readConfig() });
  });
  app.post("/admin/product", guard, (req, res) => {
    writeConfig(req.body || {});
    res.json({ ok: true, config: readConfig() });
  });

  console.log(`Admin mounted (${process.env.ADMIN_PASSWORD ? "password set" : "DEFAULT password 'southline-admin' — set ADMIN_PASSWORD!"}; /admin/*)`);
}

module.exports = { mountAdmin, readConfig, _tokens: tokens };
