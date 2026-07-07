/**
 * Sign-up + subscription billing (Stripe) — tiered.
 * -------------------------------------------------
 * Three plans (see plans.js): Starter / Pro / Premium, each a one-time setup
 * fee + a monthly subscription. A discount code (global or per-customer) can
 * reduce the setup and/or monthly amount at checkout.
 *
 * Flow:
 *   1. Client picks a plan + fills the form (business, email, password, [code]).
 *   2. POST /create-checkout-session -> stores a PENDING account (with chosen
 *      plan), returns a Stripe Checkout URL with the (possibly discounted) lines.
 *   3. Client pays. Stripe -> POST /stripe-webhook -> account marked active,
 *      provisioning pipeline fires, discount use recorded.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DASHBOARD_URL.
 * Per-plan price overrides live in plans.js.
 */
const express = require("express");
const store = require("./store");
const plans = require("./plans");
const discounts = require("./discounts");
const { hashPassword } = require("./auth");

const configured = () => !!process.env.STRIPE_SECRET_KEY;
const stripe = () => require("stripe")(process.env.STRIPE_SECRET_KEY);
const cents = (n) => Math.round(n * 100);

function mountBilling(app) {
  // Public pricing — the whole tier table, so the gate can render it.
  app.get("/pricing", (_req, res) =>
    res.json({ currency: "USD", plans: plans.listPlans() }));

  // Start sign-up: store the pending account, return a Checkout URL.
  app.post("/create-checkout-session", async (req, res) => {
    const { email, business, password, website, plan: planId, discountCode } = req.body || {};
    if (!email || !business || !password)
      return res.status(400).json({ error: "Enter your business name, email and a password." });
    if (store.find(email) && store.find(email).active)
      return res.status(400).json({ error: "That email already has an account — just log in." });

    const plan = plans.getPlan(planId);
    let setup = plan.setup, monthly = plan.monthly, codeApplied = null;
    if (discountCode) {
      const ev = discounts.evaluate(discountCode, { email, setup, monthly });
      if (ev.ok) { setup = ev.preview.setup; monthly = ev.preview.monthly; codeApplied = ev.discount.code; }
    }

    const { salt, hash } = hashPassword(password);
    store.upsert({ username: email, business, website: website || "", plan: plan.id,
      discountCode: codeApplied || "", salt, hash, active: false, createdAt: new Date().toISOString() });

    if (!configured())
      return res.status(503).json({ error: "Billing isn't switched on yet (no Stripe key on the server)." });

    try {
      const dash = process.env.DASHBOARD_URL || req.headers.origin || "";
      const line_items = [
        { price_data: { currency: "usd", product_data: { name: `AI Receptionist — ${plan.name} (monthly)` },
            unit_amount: cents(monthly), recurring: { interval: "month" } }, quantity: 1 },
      ];
      if (setup > 0)
        line_items.push({ price_data: { currency: "usd", product_data: { name: `AI Receptionist — ${plan.name} setup (one-time)` },
            unit_amount: cents(setup) }, quantity: 1 });

      const session = await stripe().checkout.sessions.create({
        mode: "subscription",
        customer_email: email,
        client_reference_id: email,
        metadata: { email, business, plan: plan.id, discountCode: codeApplied || "" },
        subscription_data: { metadata: { email, business, plan: plan.id } },
        line_items,
        success_url: dash + "?signup=success",
        cancel_url: dash + "?signup=cancel",
      });
      res.json({ ok: true, url: session.url, plan: plan.id, charged: { setup, monthly } });
    } catch (e) {
      console.error("stripe checkout error:", e.message);
      res.status(500).json({ error: "Couldn't start checkout. Try again." });
    }
  });

  // Stripe webhook — activate on payment, suspend on cancellation.
  app.post("/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {
    if (!configured()) return res.json({ received: true });
    let event;
    try {
      const whsec = process.env.STRIPE_WEBHOOK_SECRET;
      event = whsec
        ? stripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], whsec)
        : JSON.parse(req.body.toString());
    } catch (e) {
      console.error("webhook signature failed:", e.message);
      return res.status(400).send("bad signature");
    }
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const email = s.customer_email || s.client_reference_id || (s.metadata && s.metadata.email);
      const code = s.metadata && s.metadata.discountCode;
      if (email) {
        store.setActive(email, true);
        if (code) { try { discounts.recordUse(code); } catch (e) {} }
        console.log("✅ subscription active:", email, "(plan", (s.metadata && s.metadata.plan) || "?", ")");
        const acct = store.find(email);
        if (acct) {
          try { require("./provision-pipeline").runProvisioning(acct).catch((e) => console.error("provisioning error:", e.message)); }
          catch (e) { console.error("provisioning not run:", e.message); }
        }
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const email = event.data.object.metadata && event.data.object.metadata.email;
      if (email) { store.setActive(email, false); console.log("⛔ subscription cancelled:", email); }
    }
    res.json({ received: true });
  });

  console.log(`Billing mounted (${configured() ? "Stripe LIVE" : "no STRIPE_SECRET_KEY — sign-up stores account, payment disabled"}); ${plans.listPlans().map((p) => `${p.name} $${p.monthly}/mo`).join(", ")}`);
}

module.exports = { mountBilling };
