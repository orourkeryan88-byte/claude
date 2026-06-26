/**
 * Tiny file-backed account store for sign-ups.
 * (Manually-created accounts live in the CLIENT_ACCOUNTS env var; accounts
 * created via the sign-up + payment flow are written here.)
 *
 * NOTE: on hosts with an ephemeral filesystem (e.g. Render free tier) this file
 * resets on redeploy. For production, point ACCOUNTS_FILE at a persistent disk
 * or swap this for a database — the interface (read/upsert/find/setActive) stays
 * the same.
 */
const fs = require("fs");
const path = require("path");

const FILE = process.env.ACCOUNTS_FILE || path.join(__dirname, "accounts.json");

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { return []; }
}
function write(list) {
  try { fs.writeFileSync(FILE, JSON.stringify(list, null, 2)); return true; }
  catch (e) { console.warn("account store write failed (read-only fs?):", e.message); return false; }
}
function find(username) {
  return read().find((a) => (a.username || "").toLowerCase() === String(username || "").toLowerCase());
}
function upsert(acct) {
  const list = read();
  const i = list.findIndex((a) => (a.username || "").toLowerCase() === acct.username.toLowerCase());
  if (i >= 0) list[i] = { ...list[i], ...acct }; else list.push(acct);
  write(list);
  return acct;
}
function setActive(username, active) {
  const list = read();
  const a = list.find((x) => (x.username || "").toLowerCase() === String(username || "").toLowerCase());
  if (a) { a.active = active; write(list); }
  return a;
}
module.exports = { read, write, find, upsert, setActive, FILE };
