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
  - *Lead API URL* — optional. Your builder app URL (e.g. a Railway link). Leave blank to use email/WhatsApp only.
  - *Demo site 1 / 2 links* — paste the live URLs of your example sites (e.g. Kelly Plumbing, Blackrock Handyman).
  - *Case study page link* — see "Before/after case study" below.
  - *Case study live demo link* — where the before/after demo site itself is hosted.
- **SEO / Sharing** — meta description and the title/description shown when the link is shared on Facebook or WhatsApp.

## Before/after case study

The theme ships a second page template, `page.case-study`, with a before/after comparison, a "what we changed" breakdown, and a final CTA — built from a previous redesign project.

To put it live:

1. In Shopify admin go to **Online Store → Pages → Add page**. Give it a title (e.g. "Case Study").
2. In the page editor, under **Theme template**, pick **`case-study`**.
3. Save, then copy that page's URL into the **Case study page link** theme setting — this makes the "See the case study →" card on the homepage point to it.
4. If the live before/after demo site is hosted somewhere (e.g. a separate link), paste that into **Case study live demo link** — this powers the "View live demo →" button on the case study page.

## How leads work

When a visitor finishes the chatbot (name → trade → area → phone):

- If a **Lead API URL** is set, the lead is saved to your builder's `/leads` dashboard.
- Either way they get a **WhatsApp** (and email) handoff button, pre-filled with their details, so the lead reaches you instantly.

The chatbot widget itself is a single shared snippet (`snippets/chatbot-widget.liquid`), rendered site-wide from the layout — so it appears on every page, including the case study.

## Notes

- The homepage (`templates/index.liquid`) is the Southline landing page. The other templates are minimal stubs so the theme imports/publishes cleanly — this theme is built for a marketing page, not a product catalogue.
- Edit copy directly in `templates/index.liquid` (homepage) or `templates/page.case-study.liquid` (case study); shared styles live in `assets/southline.css`, case-study-only styles in `assets/case-study.css`, and the chatbot logic is in `assets/southline.js`.
