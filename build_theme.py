#!/usr/bin/env python3
import os, re, json, shutil

ROOT     = "/home/user/relier-"
SRC      = os.path.join(ROOT, "southline.html")
CASE_SRC = os.path.join(ROOT, "before-after.html")
OUT      = os.path.join(ROOT, "southline-shopify-theme")

WIDGET_MARKER   = "<!-- ════════════ CHATBOT ════════════ -->"
CHAT_CSS_MARKER = "/* ════════════ CHATBOT (shared widget) ════════════ */"

html = open(SRC, encoding="utf-8").read()

# ── extract style, script, body ──
css    = re.search(r"<style>(.*?)</style>", html, re.S).group(1).strip()
script = re.search(r"<script>(.*?)</script>", html, re.S).group(1).strip()
body_full = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

# body markup splits into: page content | chatbot widget markup | <script>
pre_script = body_full[:body_full.index("<script>")]
widget_idx = pre_script.index(WIDGET_MARKER)
body        = pre_script[:widget_idx].strip()
widget_html = pre_script[widget_idx:].strip()

# ── parameterise homepage body (demo links, case study link, footer email) ──
body = body.replace('href="kelly-plumbing/index.html"',
                    "href=\"{{ settings.demo1_url | default: '#' }}\"")
body = body.replace('href="blackrock-handyman/index.html"',
                    "href=\"{{ settings.demo2_url | default: '#' }}\"")
body = body.replace('href="before-after.html"',
                    "href=\"{{ settings.case_study_url | default: '#' }}\"")
body = body.replace('<a href="mailto:orourkeryan88@gmail.com">orourkeryan88@gmail.com</a>',
                    '<a href="mailto:{{ settings.contact_email }}">{{ settings.contact_email }}</a>')

# ── parameterise script: read config from window.SOUTHLINE_CONFIG ──
script = script.replace(
'const SOUTHLINE_EMAIL    = "orourkeryan88@gmail.com";\n'
'const SOUTHLINE_WHATSAPP = "353851740783";   // 085 174 0783 in international format.\n'
'const SOUTHLINE_API      = "";   // builder URL to save leads, e.g. "https://your-app.up.railway.app".\n'
'                                 // Leave "" to skip the database and use email/WhatsApp only.',
'const _C = window.SOUTHLINE_CONFIG || {};\n'
'const SOUTHLINE_EMAIL    = _C.email    || "orourkeryan88@gmail.com";\n'
'const SOUTHLINE_WHATSAPP = _C.whatsapp || "";\n'
'const SOUTHLINE_API      = _C.api      || "";\n'
'const SOUTHLINE_DEMO1    = _C.demo1    || "#";\n'
'const SOUTHLINE_DEMO2    = _C.demo2    || "#";')
# chatbot "examples" reply links -> config demo urls
script = script.replace("kelly-plumbing/index.html",     '" + SOUTHLINE_DEMO1 + "')
script = script.replace("blackrock-handyman/index.html", '" + SOUTHLINE_DEMO2 + "')

# ── case study page (before-after.html) ──
chtml = open(CASE_SRC, encoding="utf-8").read()
case_css_full = re.search(r"<style>(.*?)</style>", chtml, re.S).group(1)
# the chatbot widget CSS is already shipped site-wide in southline.css — drop the duplicate
case_css = case_css_full[:case_css_full.index(CHAT_CSS_MARKER)].strip()

case_body_full = re.search(r"<body>(.*?)</body>", chtml, re.S).group(1)
case_pre_script = case_body_full[:case_body_full.index("<script>")]
case_widget_idx = case_pre_script.index(WIDGET_MARKER)
case_body = case_pre_script[:case_widget_idx].strip()

case_body = case_body.replace('href="southline.html"', 'href="{{ routes.root_url }}"')
case_body = case_body.replace('href="case-study-demo/index.html"',
                    "href=\"{{ settings.case_study_demo_url | default: '#' }}\"")
case_body = case_body.replace('<a href="mailto:orourkeryan88@gmail.com">orourkeryan88@gmail.com</a>',
                    '<a href="mailto:{{ settings.contact_email }}">{{ settings.contact_email }}</a>')

# ── (re)create theme tree ──
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
for d in ["assets", "config", "layout", "locales", "sections", "snippets",
          "templates", "templates/customers"]:
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

def w(rel, content):
    with open(os.path.join(OUT, rel), "w", encoding="utf-8") as f:
        f.write(content)

# assets
w("assets/southline.css",  css + "\n")
w("assets/southline.js",   script + "\n")
w("assets/case-study.css", case_css + "\n")

# snippets — chatbot widget markup, rendered site-wide from the layout
w("snippets/chatbot-widget.liquid", widget_html + "\n")

# layout/theme.liquid
w("layout/theme.liquid", """<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#00ff88">
  <title>{{ page_title | default: shop.name }}</title>
  {%- if settings.meta_description != blank -%}
    <meta name="description" content="{{ settings.meta_description }}">
  {%- endif -%}
  <meta property="og:type" content="website">
  <meta property="og:title" content="{{ settings.og_title | default: shop.name }}">
  <meta property="og:description" content="{{ settings.og_description }}">
  <meta property="og:site_name" content="{{ shop.name }}">
  <meta name="twitter:card" content="summary_large_image">
  {{ content_for_header }}
  {{ 'southline.css' | asset_url | stylesheet_tag }}
  {%- if template == 'page.case-study' -%}
  {{ 'case-study.css' | asset_url | stylesheet_tag }}
  {%- endif -%}
</head>
<body>
  {{ content_for_layout }}

  {% render 'chatbot-widget' %}

  <script>
    window.SOUTHLINE_CONFIG = {
      email:    {{ settings.contact_email | json }},
      whatsapp: {{ settings.whatsapp | json }},
      api:      {{ settings.api_url | json }},
      demo1:    {{ settings.demo1_url | json }},
      demo2:    {{ settings.demo2_url | json }}
    };
  </script>
  {{ 'southline.js' | asset_url | script_tag }}
</body>
</html>
""")

# templates/index.liquid — the landing page
w("templates/index.liquid", body + "\n")

# templates/page.case-study.liquid — before/after case study (assign to a Page in admin)
w("templates/page.case-study.liquid", case_body + "\n")

# minimal but valid stub templates so the theme imports/publishes cleanly
stub = '<div style="max-width:800px;margin:0 auto;padding:60px 24px;font-family:-apple-system,Segoe UI,sans-serif;color:#e8e8e8;background:#0a0a0a;min-height:60vh">{body}</div>\n'
w("templates/404.liquid",              stub.format(body='<h1>Page not found</h1><p><a style="color:#00ff88" href="/">Back to Southline</a></p>'))
w("templates/page.liquid",             stub.format(body='<h1>{{ page.title }}</h1>{{ page.content }}'))
w("templates/product.liquid",          stub.format(body='<h1>{{ product.title }}</h1>{{ product.description }}'))
w("templates/collection.liquid",       stub.format(body='<h1>{{ collection.title }}</h1>'))
w("templates/list-collections.liquid", stub.format(body='<h1>Collections</h1>'))
w("templates/cart.liquid",             stub.format(body='<h1>Cart</h1>'))
w("templates/blog.liquid",             stub.format(body='<h1>{{ blog.title }}</h1>'))
w("templates/article.liquid",          stub.format(body='<h1>{{ article.title }}</h1>{{ article.content }}'))
w("templates/search.liquid",           stub.format(body='<h1>Search</h1>'))
w("templates/gift_card.liquid",        '{% layout none %}\n<!doctype html><html><head><meta charset="utf-8"><title>Gift card</title></head><body style="font-family:sans-serif;text-align:center;padding:60px"><h1>Gift card</h1><p>{{ gift_card.balance | money }}</p></body></html>\n')

# customer templates (stubs)
for name, title in [("account","My account"),("activate_account","Activate account"),
                    ("addresses","My addresses"),("login","Login"),("order","Order"),
                    ("register","Create account"),("reset_password","Reset password")]:
    w("templates/customers/%s.liquid" % name, stub.format(body='<h1>%s</h1>' % title))

# locales
w("locales/en.default.json", "{}\n")

# config/settings_schema.json
schema = [
  {
    "name": "theme_info",
    "theme_name": "Southline",
    "theme_version": "1.1.0",
    "theme_author": "Southline Agency",
    "theme_documentation_url": "https://southline.ie",
    "theme_support_url": "https://southline.ie"
  },
  {
    "name": "Southline — Contact & Leads",
    "settings": [
      {"type":"paragraph","content":"These power the chatbot and contact links. Phone must be international format with no + or spaces (Ireland 085… becomes 35385…)."},
      {"type":"text","id":"contact_email","label":"Contact email","default":"orourkeryan88@gmail.com"},
      {"type":"text","id":"whatsapp","label":"WhatsApp number (intl, e.g. 353851740783)","default":"353851740783"},
      {"type":"text","id":"api_url","label":"Lead API URL (optional — your builder app)","info":"Leave blank to use email/WhatsApp only."},
      {"type":"header","content":"Portfolio links"},
      {"type":"url","id":"demo1_url","label":"Demo site 1 link (Kelly Plumbing)"},
      {"type":"url","id":"demo2_url","label":"Demo site 2 link (Blackrock Handyman)"},
      {"type":"url","id":"case_study_url","label":"Case study page link","info":"Create a Page in admin, assign it the \"case-study\" template, then paste its link here."},
      {"type":"url","id":"case_study_demo_url","label":"Case study live demo link","info":"Where the before/after demo site is hosted, e.g. a separate link sent to that prospect."}
    ]
  },
  {
    "name": "Southline — SEO / Sharing",
    "settings": [
      {"type":"textarea","id":"meta_description","label":"Meta description",
       "default":"Southline builds clean, professional websites for Dublin tradesmen. €400 to build, €50/month hosting. See your site before you pay a cent."},
      {"type":"text","id":"og_title","label":"Social share title",
       "default":"Southline — Websites for Tradesmen Who Don't Have One"},
      {"type":"textarea","id":"og_description","label":"Social share description",
       "default":"Clean, professional websites for Dublin tradesmen. €400 to build, €50/month. See your site free before you pay a cent."}
    ]
  }
]
w("config/settings_schema.json", json.dumps(schema, indent=2) + "\n")

# config/settings_data.json
data = {"current": {
  "contact_email":"orourkeryan88@gmail.com",
  "whatsapp":"353851740783",
  "api_url":"",
  "demo1_url":"",
  "demo2_url":"",
  "case_study_url":"",
  "case_study_demo_url":"",
  "meta_description":"Southline builds clean, professional websites for Dublin tradesmen. €400 to build, €50/month hosting. See your site before you pay a cent.",
  "og_title":"Southline — Websites for Tradesmen Who Don't Have One",
  "og_description":"Clean, professional websites for Dublin tradesmen. €400 to build, €50/month. See your site free before you pay a cent."
}}
w("config/settings_data.json", json.dumps(data, indent=2) + "\n")

# keep empty dirs in git/zip
for d in ["sections"]:
    w(os.path.join(d, ".keep"), "")

print("Theme written to", OUT)
for dirpath, _, files in os.walk(OUT):
    for fn in sorted(files):
        rel = os.path.relpath(os.path.join(dirpath, fn), OUT)
        print("  ", rel)
