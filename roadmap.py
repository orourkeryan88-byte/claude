import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle

bg = '#0a0a0a'
accent = '#00ff88'
fig_w, fig_h = 22, 26.5

PHASES = [
    {
        'range': 'MONTH 1–2', 'title': 'CONVERT THE PIPELINE',
        'bullets': [
            'Call all 46 verified leads from the Southline list',
            'Generate a live RELIER demo link before/during each call —',
            '   "here\'s your site, already built"',
            'Close first clients at €400 upfront + €50/mo hosting',
            'Track answer rate, demo-sent rate, close rate to tune the script',
        ],
        'target': '10–15 active clients  |  ~€750/mo recurring',
    },
    {
        'range': 'MONTH 3–4', 'title': 'SYSTEMIZE & REFILL THE LIST',
        'bullets': [
            'Turn the verify-no-website + verify-phone workflow into a',
            '   repeatable SOP the whole team can run',
            'Research 150+ new verified leads beyond the current areas',
            'Split roles clearly: researcher / caller-closer / RELIER builder',
        ],
        'target': '25–30 active clients  |  ~€1,400/mo recurring',
    },
    {
        'range': 'MONTH 5–6', 'title': 'SCALE OUTREACH',
        'bullets': [
            'Ramp weekly dial volume across the team using the verified list',
            'Add more trade-specific RELIER themes to speed up demo turnaround',
            'Introduce upsells: Google Business Profile setup, basic local SEO',
        ],
        'target': '40–50 active clients  |  ~€2,250/mo recurring',
    },
    {
        'range': 'MONTH 7–9', 'title': 'RETENTION & EXPANSION',
        'bullets': [
            'Build a check-in process for €50/mo hosting clients to cut churn',
            'Expand research beyond current Dublin pockets',
            '   (e.g. Wicklow / Kildare commuter belt)',
            'Launch a referral incentive — happy clients refer other tradesmen',
        ],
        'target': '65–75 active clients  |  ~€3,500/mo recurring',
    },
    {
        'range': 'MONTH 10–12', 'title': 'STABILIZE & DECIDE WHAT\'S NEXT',
        'bullets': [
            'Lock in steady-state close rate, churn rate, and team comp structure',
            'Reinvest €400 upfront fees into more lead research + team capacity',
            'Open question to revisit: keep RELIER internal-only, or productize it',
            '   later — not committed for this window',
        ],
        'target': '90–100 active clients  |  ~€4,750/mo recurring',
    },
]

fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=150)
fig.patch.set_facecolor(bg)
ax.set_facecolor(bg)
ax.set_xlim(0, fig_w)
ax.set_ylim(0, fig_h)
ax.axis('off')

title_y = fig_h - 0.9
ax.text(fig_w / 2, title_y, 'SOUTHLINE × RELIER — 6–12 MONTH ROADMAP',
        color=accent, fontsize=27, fontweight='bold', ha='center', family='monospace')
ax.text(fig_w / 2, title_y - 0.55,
        'From 46 verified no-website leads to a recurring hosting business',
        color='#888888', fontsize=14, ha='center', family='monospace')
ax.text(fig_w / 2, title_y - 0.95,
        'Pricing: €400 upfront build + €50/month hosting  ·  Team: researcher / caller-closer / RELIER builder',
        color='#555555', fontsize=11.5, ha='center', family='monospace')

rail_x = 1.5
top_y = title_y - 1.7
bottom_y = 1.0
ax.plot([rail_x, rail_x], [bottom_y, top_y], color='#2a2a2a', linewidth=3, zorder=0)

n = len(PHASES)
card_gap = 0.35
card_h = (top_y - bottom_y - card_gap * (n - 1)) / n
card_x = rail_x + 0.9
card_w = fig_w - card_x - 0.8

y = top_y
for i, p in enumerate(PHASES):
    y_top = y
    y_bottom = y_top - card_h

    ax.add_patch(Circle((rail_x, (y_top + y_bottom) / 2), 0.22, facecolor=accent,
                         edgecolor=bg, linewidth=3, zorder=3))
    ax.text(rail_x, (y_top + y_bottom) / 2, str(i + 1), color=bg, fontsize=14,
            fontweight='bold', ha='center', va='center', family='monospace', zorder=4)

    card_bg = '#141414' if i % 2 == 0 else '#101010'
    ax.add_patch(FancyBboxPatch((card_x, y_bottom), card_w, card_h,
                                 boxstyle="round,pad=0,rounding_size=0.12",
                                 facecolor=card_bg, edgecolor='#262626', linewidth=1, zorder=1))

    pad = 0.35
    ax.text(card_x + pad, y_top - 0.55, p['range'], color=accent, fontsize=13,
            fontweight='bold', family='monospace', va='center')
    ax.text(card_x + pad, y_top - 1.0, p['title'], color='#ffffff', fontsize=18,
            fontweight='bold', family='monospace', va='center')

    by = y_top - 1.55
    for b in p['bullets']:
        prefix = '' if b.startswith('   ') else '• '
        ax.text(card_x + pad + (0.25 if b.startswith('   ') else 0), by,
                prefix + b.strip(), color='#cccccc', fontsize=12.5, family='monospace', va='center')
        by -= 0.42

    ax.plot([card_x + pad, card_x + card_w - pad], [y_bottom + 0.55, y_bottom + 0.55],
            color='#2a2a2a', linewidth=1)
    ax.text(card_x + pad, y_bottom + 0.28, p['target'], color='#7ee787', fontsize=13.5,
            fontweight='bold', family='monospace', va='center')

    y = y_bottom - card_gap

ax.text(fig_w / 2, 0.45,
        "Southline Agency × RELIER — websites for tradesmen who don't have one",
        color='#555555', fontsize=12, ha='center', family='monospace')

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
plt.savefig('southline-roadmap.png', facecolor=bg, bbox_inches='tight', pad_inches=0.3)
print("Roadmap saved to southline-roadmap.png")
