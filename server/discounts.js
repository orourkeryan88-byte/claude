/**
 * Discount codes.
 * ---------------
 * Codes can be global (anyone can use) or tied to one customer email. They
 * discount the SETUP fee, the MONTHLY fee, or both, by a percent or a fixed $.
 *
 * Stored in a small JSON file (DISCOUNTS_FILE). The owner manages them from the
 * admin page; the sign-up form validates a typed code against POST /validate-discount.
 *
 * A code object:
 *   { code, type:"percent"|"fixed", amount, applies:"setup"|"monthly"|"both",
 *     email?:"only-this-customer@x.com", maxUses?:N, uses:N, expires?:ISO, note?, active }
 */
const fs = require("fs");
const path = require("path");

const FILE = process.env.DISCOUNTS_FILE || path.join(__dirname, "discounts.json");

function read() { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { return []; } }
function write(list) {
  try { fs.writeFileSync(FILE, JSON.stringify(list, null, 2)); return true; }
  catch (e) { console.warn("discount store write failed:", e.message); return false; }
}
function norm(c) { return String(c || "").trim().toUpperCase(); }

function find(code) {
  const c = norm(code);
  return read().find((d) => norm(d.code) === c) || null;
}

// Validate a code for a given customer + plan. Returns { ok, reason?, discount?, preview }.
function evaluate(code, { email, setup, monthly } = {}) {
  const d = find(code);
  if (!d) return { ok: false, reason: "That code isn't valid." };
  if (d.active === false) return { ok: false, reason: "That code is switched off." };
  if (d.expires && new Date(d.expires) < new Date()) return { ok: false, reason: "That code has expired." };
  if (d.maxUses && (d.uses || 0) >= d.maxUses) return { ok: false, reason: "That code has been fully used." };
  if (d.email && email && d.email.toLowerCase() !== String(email).toLowerCase())
    return { ok: false, reason: "That code is reserved for a different customer." };

  const apply = (base) => {
    if (base == null) return base;
    const off = d.type === "percent" ? base * (d.amount / 100) : Math.min(base, d.amount);
    return Math.max(0, Math.round((base - off) * 100) / 100);
  };
  const newSetup = (d.applies === "setup" || d.applies === "both") ? apply(setup) : setup;
  const newMonthly = (d.applies === "monthly" || d.applies === "both") ? apply(monthly) : monthly;
  return {
    ok: true,
    discount: d,
    label: d.type === "percent" ? `${d.amount}% off` : `$${d.amount} off`,
    appliesTo: d.applies,
    preview: { setup: newSetup, monthly: newMonthly, wasSetup: setup, wasMonthly: monthly },
  };
}

function recordUse(code) {
  const list = read();
  const d = list.find((x) => norm(x.code) === norm(code));
  if (d) { d.uses = (d.uses || 0) + 1; write(list); }
  return d;
}

function upsert(c) {
  const list = read();
  const i = list.findIndex((x) => norm(x.code) === norm(c.code));
  const rec = { active: true, uses: 0, applies: "setup", type: "percent", ...c, code: norm(c.code) };
  if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
  write(list);
  return rec;
}
function remove(code) {
  const list = read().filter((x) => norm(x.code) !== norm(code));
  write(list);
}

// Public endpoint: validate a code at sign-up. (Admin CRUD lives in admin.js.)
function mountDiscounts(app) {
  app.post("/validate-discount", (req, res) => {
    const { code, email, setup, monthly } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, reason: "Enter a code." });
    res.json(evaluate(code, { email, setup: Number(setup), monthly: Number(monthly) }));
  });
  console.log(`Discounts mounted (${read().length} code${read().length === 1 ? "" : "s"}; POST /validate-discount)`);
}

module.exports = { read, write, find, evaluate, recordUse, upsert, remove, mountDiscounts, FILE };
