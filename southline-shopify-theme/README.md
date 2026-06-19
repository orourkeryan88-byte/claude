# Southline — Shopify Theme

The Southline landing page + lead-capture chatbot, packaged as an importable Shopify theme.

## Install

1. Download **`southline-shopify-theme.zip`** (in the repo root).
2. In Shopify admin go to **Online Store → Themes**.
3. Click **Add theme → Upload zip file**, choose the zip.
4. Once it appears in your theme library, click **Customize** (or **Publish** to make it live).

## Set it up (Theme editor → Theme settings)

All the operational bits are editable — no code needed:

- **Contact & Leads**
  - *Contact email* — where email enquiries go.
  - *WhatsApp number* — international format, no `+` or spaces (e.g. `353851740783` for 085 174 0783).
  - *Lead API URL* — optional. Only needed if you run your own backend (e.g. the builder app in this repo, deployed to Railway). Leave blank — it's not required for notifications, see below.
  - *Demo site 1 / 2 links* — paste the live URLs of your example sites (e.g. Kelly Plumbing, Blackrock Handyman).
  - *Case study page link* / *Live demo page link* — see below.
- **SEO / Sharing** — meta description and the title/description shown when the link is shared on Facebook or WhatsApp.

## Getting notified of a new lead

No setup needed — this works out of the box once the theme is installed. The moment the chatbot finishes capturing a lead (name → trade → area → phone), it submits Shopify's own native contact-form request in the background. Shopify sends that straight to your store's contact-form notification email — check/set the recipient under **Settings → Notifications** in your Shopify admin (it defaults to your store's general contact email).

This needs no external server, API key, or the Lead API URL setting — it only works because the page is running on an actual Shopify storefront (it detects `window.Shopify`, which only exists there).

One caveat: if you've turned on Google reCAPTCHA spam protection for contact forms (**Settings → Customer privacy**), Shopify may reject this background submission since there's no human-solved captcha. Turn that off if you stop seeing notifications.

Visitors still also get a **WhatsApp**/**email** handoff button pre-filled with their details, as a backup way to reach you instantly.

## Before/after case study + live demo

The theme ships two extra page templates:

- **`case-study`** — the before/after comparison (a single box: 404 error → rebuild), "what we changed" breakdown, and CTA.
- **`demo`** — the standalone live demo site (the "after" rebuild). It renders on its own with `{% layout none %}`, so it keeps its own design and doesn't pull in the Southline header, styles, or chatbot. It's a plain landing page — no Southline navigation, hero, or CTA buttons layered on top — just the small "Concept redesign by Southline" line in the footer.

To put both live (each is just a Shopify Page with a template assigned):

1. **Demo page** — Admin → **Online Store → Pages → Add page**, title it (e.g. "Live Demo"). Under **Theme template**, pick **`demo`**. Save, then copy its URL into the **Live demo page link** theme setting.
2. **Case study page** — Add another page (e.g. "Case Study"). Under **Theme template**, pick **`case-study`**. Save, then copy its URL into the **Case study page link** theme setting.
3. That's it — the homepage "See the case study →" card now opens the case study, and its "View live demo →" button opens the demo page.

## Notes

- The homepage (`templates/index.liquid`) is the Southline landing page. The other templates are minimal stubs so the theme imports/publishes cleanly — this theme is built for a marketing page, not a product catalogue.
- Edit copy directly in `templates/index.liquid` (homepage), `templates/page.case-study.liquid` (case study), or `templates/page.demo.liquid` (demo); shared styles live in `assets/southline.css`, case-study-only styles in `assets/case-study.css`, and the chatbot logic is in `assets/southline.js`.
- All case-study/demo content is kept anonymous (no real business name, phone, email, or address) — it's described generically as "previous work" / "most recent work".
