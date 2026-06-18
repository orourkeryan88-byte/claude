import csv
import textwrap
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

rows = []
with open('southline-50-businesses.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for r in reader:
        if r['No.']:
            rows.append(r)

TRADE_COLORS = {
    'Plumber': '#5dd5f4', 'Electrician': '#ffd166', 'Painter': '#f4a261',
    'Plasterer': '#e76f51', 'Roofer': '#ef476f', 'Builder': '#06d6a0',
    'Carpenter': '#a78bfa', 'Gardener': '#90e0a3', 'Power': '#4cc9f0',
    'Glazier': '#c0fdff', 'Gas': '#ffb703', 'Handyman': '#fb8500',
    'Security': '#ffd166',
}

def trade_color(trade):
    for key, color in TRADE_COLORS.items():
        if key.lower() in trade.lower():
            return color
    return '#e0e0e0'

n = len(rows)
bg = '#0a0a0a'
header_color = '#00ff88'
fig_w = 30

cols = [
    ('No.', 0.3, 0.9),
    ('Business Name', 1.3, 4.2),
    ('Owner / Contact', 5.6, 2.6),
    ('Trade', 8.3, 2.0),
    ('Mobile', 10.4, 1.7),
    ('Landline', 12.2, 1.6),
    ('Email', 13.9, 3.4),
    ('Area / Address', 17.4, 3.8),
    ('Facebook', 21.3, 3.6),
    ('Website Status', 25.0, 2.0),
    ('Main Sell Point', 27.1, 2.6),
]

CHARS_PER_UNIT = 8.0
LINE_H = 0.34
MIN_ROW_H = 0.85
PAD = 0.18

def wrap_cell(text, w):
    text = text if text else '—'
    wrap_chars = max(int(w * CHARS_PER_UNIT), 10)
    return textwrap.wrap(text, wrap_chars) or ['—']

row_data = []
row_heights = []
for r in rows:
    values = [r['No.'], r['Business Name'], r['Owner / Contact'], r['Trade'],
              r['Mobile'], r['Landline'], r['Email'], r['Area / Address'],
              r['Facebook'], r['Website Status'], r['Main Sell Point']]
    wrapped_cells = [wrap_cell(v, w) for v, (_, _, w) in zip(values, cols)]
    max_lines = max(len(c) for c in wrapped_cells)
    h = max(MIN_ROW_H, max_lines * LINE_H + PAD)
    row_data.append(wrapped_cells)
    row_heights.append(h)

title_block_h = 2.3
header_h = 0.62
footer_h = 0.6
fig_h = title_block_h + header_h + sum(row_heights) + footer_h

fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=150)
fig.patch.set_facecolor(bg)
ax.set_facecolor(bg)
ax.set_xlim(0, fig_w)
ax.set_ylim(0, fig_h)
ax.axis('off')

title_y = fig_h - 0.9
ax.text(fig_w / 2, title_y, 'SOUTHLINE — DUBLIN TRADESMEN COLD CALL LIST (NO WEBSITE)',
        color=header_color, fontsize=26, fontweight='bold', ha='center',
        family='monospace')
ax.text(fig_w / 2, title_y - 0.55, f'{n} verified leads — wealthy South & North Dublin areas',
        color='#888888', fontsize=14, ha='center', family='monospace')

table_top = title_y - 1.3

for label, x, w in cols:
    ax.text(x + 0.05, table_top - header_h / 2, label, color=header_color,
            fontsize=16, fontweight='bold', va='center', family='monospace')

ax.plot([0.2, fig_w - 0.2], [table_top - header_h, table_top - header_h],
        color=header_color, linewidth=1.5)

y_cursor = table_top - header_h
for i, (r, wrapped_cells, h) in enumerate(zip(rows, row_data, row_heights)):
    y_top = y_cursor
    y_bottom = y_top - h
    y_mid = (y_top + y_bottom) / 2
    bg_color = '#141414' if i % 2 == 0 else '#0d0d0d'
    ax.add_patch(FancyBboxPatch((0.2, y_bottom), fig_w - 0.4, h,
                                 boxstyle="square,pad=0", facecolor=bg_color,
                                 edgecolor='none', zorder=0))
    tcolor = trade_color(r['Trade'])
    colors = ['#666666', '#ffffff', '#bbbbbb', tcolor, '#7ee787', '#7ee787',
              '#bbbbbb', '#bbbbbb', '#8ecae6',
              '#ff6b6b' if 'NO WEBSITE' in r['Website Status'].upper() else '#ffd166',
              '#dddddd']
    for (label, x, w), lines, color in zip(cols, wrapped_cells, colors):
        n_lines = len(lines)
        start_y = y_mid + (n_lines - 1) * LINE_H / 2
        for li, line in enumerate(lines):
            ax.text(x + 0.05, start_y - li * LINE_H, line, color=color,
                    fontsize=14.5, va='center', family='monospace')
    y_cursor = y_bottom

ax.plot([0.2, fig_w - 0.2], [y_cursor - 0.05, y_cursor - 0.05], color='#333333', linewidth=1)
ax.text(fig_w / 2, y_cursor - footer_h / 2 - 0.1,
        "Southline Agency — websites for tradesmen who don't have one",
        color='#555555', fontsize=12, ha='center', family='monospace')

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
plt.savefig('southline-50-businesses.png', facecolor=bg, bbox_inches='tight', pad_inches=0.3)
print(f"Generated table with {n} rows, fig size {fig_w}x{fig_h:.1f}")
