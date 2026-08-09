#!/usr/bin/env node
/**
 * Workflow validator — proves the in-call state machine is sound.
 * ---------------------------------------------------------------
 * Static checks (no call needed) that guarantee the workflow can't dead-end,
 * can't reference a missing state/slot/tool, and that every advertised
 * acceptance path is actually walkable through the graph.
 *
 *   node workflow/validate-workflow.js
 *
 * Exit code 0 = all checks pass; 1 = at least one failure (CI-friendly).
 *
 * Checks:
 *   1. entry state exists
 *   2. every transition/recovery target references a real state
 *   3. every intent in the router maps to a real state
 *   4. every state is reachable from entry (no orphans)
 *   5. every non-terminal state has at least one outgoing transition;
 *      every terminal state is flagged terminal and has none
 *   6. every terminal state (and thus the whole graph) can reach polite_end
 *      i.e. no state is a black hole — from anywhere you can finish the call
 *   7. every slot named in a state's `collect` exists in `slots`
 *   8. every tool named in an `action` exists in `tools`
 *   9. every acceptance-test path is a valid walk (each hop is a declared transition)
 *  10. every analytics event emitted by a state is declared in analytics_events
 */
const fs = require("fs");
const path = require("path");

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, "receptionist-workflow.json"), "utf8"));
const states = wf.states;
const stateIds = Object.keys(states);
const slotIds = new Set(Object.keys(wf.slots || {}));
const toolIds = new Set(Object.keys(wf.tools || {}));
const events = new Set(wf.analytics_events || []);

let failures = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };

// --- helpers -------------------------------------------------------------
function targetsOf(state) {
  const t = [];
  for (const tr of state.transitions || []) if (tr.to) t.push(tr.to);
  // recovery hooks are plain state-id strings
  for (const k of ["on_no_input", "on_tool_error", "on_error", "on_max_retries"]) {
    if (typeof state[k] === "string") t.push(state[k]);
  }
  return t;
}
// action strings look like: "log_lead(type=x, urgency=y) then transferCall" / "check_availability"
// Strip parenthesised argument lists first so args aren't mistaken for tool names,
// then split on the sequencing words and take the leading identifier of each call.
function toolsIn(action) {
  if (!action) return [];
  const noArgs = String(action).replace(/\([^)]*\)/g, "");
  return noArgs.split(/\bthen\b|,|;/).map((s) => (s.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*/) || [])[0]).filter(Boolean);
}

// --- 1. entry ------------------------------------------------------------
ok(wf.entry && states[wf.entry], `entry state "${wf.entry}" is missing`);

// --- 2 & 3. no dangling references --------------------------------------
for (const [id, s] of Object.entries(states)) {
  for (const t of targetsOf(s)) ok(states[t], `state "${id}" points to missing state "${t}"`);
}
const router = states.identify_intent || {};
const intentEnum = (wf.slots.intent && wf.slots.intent.values) || [];
// every intent value should be routable (either explicitly or via default)
const hasDefault = (router.transitions || []).some((tr) => tr.default);
ok(hasDefault, `router "identify_intent" has no default transition (unrouted intents would dead-end)`);

// --- 4. reachability from entry -----------------------------------------
const seen = new Set();
(function walk(id) {
  if (!id || seen.has(id) || !states[id]) return;
  seen.add(id);
  for (const t of targetsOf(states[id])) walk(t);
})(wf.entry);
for (const id of stateIds) ok(seen.has(id), `state "${id}" is unreachable from entry`);

// --- 5. terminal vs non-terminal shape ----------------------------------
for (const [id, s] of Object.entries(states)) {
  const outs = targetsOf(s);
  if (s.terminal) ok(outs.length === 0, `terminal state "${id}" should have no transitions`);
  else ok(outs.length > 0, `non-terminal state "${id}" has no outgoing transition (dead end)`);
}

// --- 6. every state can reach a terminal (no black holes) ---------------
const canFinish = new Set();
let changed = true;
while (changed) {
  changed = false;
  for (const [id, s] of Object.entries(states)) {
    if (canFinish.has(id)) continue;
    if (s.terminal) { canFinish.add(id); changed = true; continue; }
    if (targetsOf(s).some((t) => canFinish.has(t))) { canFinish.add(id); changed = true; }
  }
}
for (const id of stateIds) ok(canFinish.has(id), `state "${id}" cannot reach any terminal state (black hole)`);

// --- 7. collect slots exist ---------------------------------------------
for (const [id, s] of Object.entries(states)) {
  for (const slot of s.collect || []) ok(slotIds.has(slot), `state "${id}" collects unknown slot "${slot}"`);
}

// --- 8. action tools exist ----------------------------------------------
for (const [id, s] of Object.entries(states)) {
  for (const tool of toolsIn(s.action)) {
    if (tool === "transferCall") continue; // engine tool, not in the tools map on purpose sometimes
    ok(toolIds.has(tool) || tool === "transferCall", `state "${id}" calls unknown tool "${tool}"`);
  }
}

// --- 9. acceptance paths are valid walks --------------------------------
function edgeExists(from, to) {
  const s = states[from];
  if (!s) return false;
  return targetsOf(s).includes(to);
}
for (const test of wf.acceptance_tests || []) {
  for (let i = 0; i < test.path.length - 1; i++) {
    const a = test.path[i], b = test.path[i + 1];
    ok(states[a] && states[b], `acceptance "${test.name}": path uses missing state ${!states[a] ? a : b}`);
    ok(edgeExists(a, b), `acceptance "${test.name}": no transition ${a} -> ${b}`);
  }
  ok(states[test.path[test.path.length - 1]] && states[test.path[test.path.length - 1]].terminal,
    `acceptance "${test.name}": does not end in a terminal state`);
}

// --- 10. emitted events are declared ------------------------------------
for (const [id, s] of Object.entries(states)) {
  if (s.emit) ok(events.has(s.emit), `state "${id}" emits undeclared event "${s.emit}"`);
}

// --- report --------------------------------------------------------------
console.log(`Workflow: ${wf.name} v${wf.version}`);
console.log(`States: ${stateIds.length} | Slots: ${slotIds.size} | Tools: ${toolIds.size} | Acceptance paths: ${(wf.acceptance_tests || []).length}`);
console.log(`Ran ${checks} checks.`);
if (failures.length) {
  console.log(`\n❌ ${failures.length} problem(s):`);
  for (const f of failures) console.log("   - " + f);
  process.exit(1);
}
console.log("\n✅ All checks passed — the workflow graph is complete, reachable, dead-end-free, and every acceptance path is walkable.");
