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
- **SEO / Sharing** — meta description and the title/description shown when the link is shared on Facebook or WhatsApp.

## How leads work

When a visitor finishes the chatbot (name → trade → area → phone):

- If a **Lead API URL** is set, the lead is saved to your builder's `/leads` dashboard.
- Either way they get a **WhatsApp** (and email) handoff button, pre-filled with their details, so the lead reaches you instantly.

## Notes

- The homepage (`templates/index.liquid`) is the Southline landing page. The other templates are minimal stubs so the theme imports/publishes cleanly — this theme is built for a marketing page, not a product catalogue.
- Edit copy directly in `templates/index.liquid`; styles live in `assets/southline.css`; the chatbot logic is in `assets/southline.js`.
