import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D

C = {
    "trigger": "#16a34a", "process": "#2563eb", "decision": "#f59e0b",
    "sms": "#0ea5e9", "cal": "#7c3aed", "wait": "#64748b",
}

fig, ax = plt.subplots(figsize=(12.5, 11))
ax.set_xlim(0, 13); ax.set_ylim(0, 15); ax.axis("off")

def box(x, y, w, h, text, color, fs=11):
    p = FancyBboxPatch((x - w/2, y - h/2), w, h,
                       boxstyle="round,pad=0.02,rounding_size=0.18",
                       linewidth=0, facecolor=color, alpha=0.95)
    ax.add_patch(p)
    ax.text(x, y, text, ha="center", va="center", color="white",
            fontsize=fs, fontweight="bold", wrap=True)

def diamond(x, y, w, h, text, color):
    pts = [(x, y+h/2), (x+w/2, y), (x, y-h/2), (x-w/2, y)]
    ax.add_patch(plt.Polygon(pts, closed=True, facecolor=color, edgecolor="none"))
    ax.text(x, y, text, ha="center", va="center", color="white", fontsize=10.5, fontweight="bold")

def arrow(x1, y1, x2, y2, label=None, lx=0, ly=0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                 mutation_scale=18, linewidth=2, color="#334155",
                 shrinkA=2, shrinkB=2))
    if label:
        ax.text((x1+x2)/2 + lx, (y1+y2)/2 + ly, label, ha="center", va="center",
                fontsize=10, fontweight="bold", color="#0f172a",
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#cbd5e1"))

ax.text(6.5, 14.5, "Southline AI Receptionist — Post-Call Workflow",
        ha="center", fontsize=16, fontweight="bold", color="#0f172a")

# main vertical chain (center x=6.5)
cx = 6.5
box(cx, 13.4, 5.4, 1.0, "Call ends in Vapi", C["trigger"], 12)
box(cx, 12.0, 5.0, 0.95, "Parse the call (name, phone,\nreason, urgency, booked?)", C["process"])
box(cx, 10.6, 5.0, 0.95, "Reply to Vapi\n(so it speaks the confirmation)", C["process"])
box(cx, 9.2, 5.0, 0.95, "Log the lead to your CRM sheet", C["process"])
box(cx, 7.8, 5.0, 0.95, "Text the owner\n(urgent calls flagged)", C["sms"])
diamond(cx, 6.1, 3.0, 1.5, "Booked an\nappointment?", C["decision"])

arrow(cx, 12.9, cx, 12.5)
arrow(cx, 11.55, cx, 11.1)
arrow(cx, 10.15, cx, 9.7)
arrow(cx, 8.75, cx, 8.3)
arrow(cx, 7.35, cx, 6.9)

# YES branch (right)
rx = 10.0
arrow(cx+1.5, 6.1, rx, 6.1, "YES", ly=0.4)
box(rx, 6.1, 4.0, 0.95, "Create Google\nCalendar event", C["cal"])
box(rx, 4.6, 4.0, 0.95, "Text caller\nconfirmation", C["sms"])
arrow(rx, 5.6, rx, 5.1)

# NO branch (left)
lx = 3.0
arrow(cx-1.5, 6.1, lx, 6.1, "NO", ly=0.4)
box(lx, 6.1, 3.6, 0.95, "Wait 1 day", C["wait"])
box(lx, 4.6, 3.6, 0.95, "Follow-up text\nto the caller", C["sms"])
arrow(lx, 5.6, lx, 5.1)

# daily summary lane (bottom)
ax.add_patch(FancyBboxPatch((0.6, 1.4), 11.8, 2.0, boxstyle="round,pad=0.02,rounding_size=0.15",
            linewidth=1.4, edgecolor="#cbd5e1", facecolor="#f8fafc"))
ax.text(6.5, 3.0, "Separate workflow — Daily Summary", ha="center", fontsize=11.5,
        fontweight="bold", color="#475569")
box(2.2, 2.1, 3.0, 0.9, "Every day 6pm", C["trigger"], 10.5)
box(5.4, 2.1, 2.6, 0.9, "Read leads", C["process"], 10.5)
box(8.2, 2.1, 2.6, 0.9, "Summarise today", C["process"], 10.5)
box(11.1, 2.1, 2.8, 0.9, "Text owner\nrecap", C["sms"], 10.5)
arrow(3.7, 2.1, 4.1, 2.1)
arrow(6.7, 2.1, 6.9, 2.1)
arrow(9.5, 2.1, 9.7, 2.1)

# legend
items = [("Trigger", C["trigger"]), ("Process", C["process"]), ("Decision", C["decision"]),
         ("Text / SMS", C["sms"]), ("Calendar", C["cal"]), ("Wait", C["wait"])]
handles = [Line2D([0],[0], marker="s", color="w", markerfacecolor=c, markersize=13, label=l) for l,c in items]
ax.legend(handles=handles, loc="lower left", ncol=3, frameon=False, fontsize=9.5,
          bbox_to_anchor=(0.01, -0.02))

plt.tight_layout()
plt.savefig("automation/workflow-diagram.png", dpi=150, bbox_inches="tight", facecolor="white")
print("saved automation/workflow-diagram.png")
