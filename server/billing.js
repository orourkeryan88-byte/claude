/**
 * Sign-up + subscription billing (Stripe).
 * -----------------------------------------
 * Pricing: €350 one-time setup fee + €80/month subscription.
 *
 * Flow:
 *   1. Client fills the "Create account" form (business, email, password).
 *   2. POST /create-checkout-session  -> stores a PENDING account, returns a
 *      Stripe Checkout URL (one-time setup line + recurring monthly line).
 *   3. Client pays on Stripe.
 *   4. Stripe calls POST /stripe-webhook (checkout.session.completed) -> the
 *      account is marked active. Now they can log in.
 *
 * Env:
 *   STRIPE_SECRET_KEY        sk_live_… / sk_test_…
 *   STRIPE_WEBHOOK_SECRET    whsec_…  (from the Stripe webhook endpoint)
 *   DASHBOARD_URL            where to send them after payment (your CRM URL)
 *   SETUP_FEE_CENTS          default 35000  (€350)
 *   MONTHLY_FEE_CENTS        default 8000   (€80)
 */
const express = require("express");
const store = require("./store");
const { hashPassword } = require("./auth");

const SETUP_CENTS = parseInt(process.env.SETUP_FEE_CENTS || "35000", 10);
const MONTHLY_CENTS = parseInt(process.env.MONTHLY_FEE_CENTS || "8000", 10);
const configured = () => !!process.env.STRIPE_SECRET_KEY;
const stripe = () => require("stripe")(process.env.STRIPE_SECRET_KEY);

function mountBilling(app) {
  // Public pricing (so the gate can display it).
  app.get("/pricing", (_req, res) =>
    res.json({ setup: SETUP_CENTS / 100, monthly: MONTHLY_CENTS / 100, currency: "EUR" }));

  // Start sign-up: store the pending account, return a Checkout URL.
  app.post("/create-checkout-session", async (req, res) => {
    const { email, business, password } = req.body || {};
    if (!email || !business || !password)
      return res.status(400).json({ error: "Enter your business name, email and a password." });
    if (store.find(email) && store.find(email).active)
      return res.status(400).json({ error: "That email already has an account — just log in." });

    const { salt, hash } = hashPassword(password);
    store.upsert({ username: email, business, salt, hash, active: false, createdAt: new Date().toISOString() });

    if (!configured())
      return res.status(503).json({ error: "Billing isn't switched on yet (no Stripe key on the server)." });

    try {
      const dash = process.env.DASHBOARD_URL || req.headers.origin || "";
      const session = await stripe().checkout.sessions.create({
        mode: "subscription",
        customer_email: email,
        client_reference_id: email,
        metadata: { email, business },
        subscription_data: { metadata: { email, business } },
        line_items: [
          { price_data: { currency: "eur", product_data: { name: "AI Receptionist — Monthly" },
              unit_amount: MONTHLY_CENTS, recurring: { interval: "month" } }, quantity: 1 },
          { price_data: { currency: "eur", product_data: { name: "AI Receptionist — Setup fee (one-time)" },
              unit_amount: SETUP_CENTS }, quantity: 1 },
        ],
        success_url: dash + "?signup=success",
        cancel_url: dash + "?signup=cancel",
      });
      res.json({ ok: true, url: session.url });
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
      if (email) {
        store.setActive(email, true);
        console.log("✅ subscription active:", email);
        // Kick off automated provisioning (build assistant → number → activate → welcome).
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

  console.log(`Billing mounted (${configured() ? "Stripe LIVE" : "no STRIPE_SECRET_KEY — sign-up stores account, payment disabled"}); setup €${SETUP_CENTS / 100}, €${MONTHLY_CENTS / 100}/mo`);
}

module.exports = { mountBilling, _prices: { SETUP_CENTS, MONTHLY_CENTS } };
