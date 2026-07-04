import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D

# warm/serious palette (matches the product brand, not default AI blue/purple)
C = {"start": "#1c1917", "router": "#c2410c", "gather": "#1f3d5c", "tool": "#0d6448",
     "act": "#12805c", "escalate": "#b91c1c", "ext": "#7c5e10", "safe": "#57534e", "mut": "#78716c"}

fig, ax = plt.subplots(figsize=(15, 12))
ax.set_xlim(0, 15); ax.set_ylim(0, 13.4); ax.axis("off")
fig.patch.set_facecolor("white")

def box(x, y, w, h, text, color, fs=9.5, dashed=False, text_color="white"):
    ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02,rounding_size=0.14",
                 linewidth=(1.5 if dashed else 0), facecolor=color, alpha=0.97,
                 edgecolor="#1c1917", linestyle=("--" if dashed else "-")))
    ax.text(x, y, text, ha="center", va="center", color=text_color, fontsize=fs, fontweight="bold")

def diamond(x, y, w, h, text, color, fs=9.5):
    ax.add_patch(plt.Polygon([(x,y+h/2),(x+w/2,y),(x,y-h/2),(x-w/2,y)], closed=True, facecolor=color))
    ax.text(x, y, text, ha="center", va="center", color="white", fontsize=fs, fontweight="bold")

def arrow(x1,y1,x2,y2,label=None,lx=0,ly=0,color="#57534e",lw=1.9,ls="-"):
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle="-|>",mutation_scale=14,
                 linewidth=lw,color=color,shrinkA=2,shrinkB=2,linestyle=ls))
    if label:
        ax.text((x1+x2)/2+lx,(y1+y2)/2+ly,label,ha="center",va="center",fontsize=8,
                fontweight="bold",color="#1c1917",bbox=dict(boxstyle="round,pad=0.18",fc="white",ec="#d6d3cd"))

ax.text(8.6, 13.05, "AI Receptionist — In-Call Workflow", ha="center", fontsize=15.5, fontweight="bold", color="#1c1917")
ax.text(8.6, 12.6, "v2 · 28 states · dead-end-free · validated", ha="center", fontsize=9.5, color="#78716c")

# ---- top: main call path -------------------------------------------------
box(7.5, 12.1, 3.2, 0.7, "GREET  ·  detect language", C["start"], 10.5)
box(7.5, 11.2, 3.0, 0.6, "compliance / recording notice", C["safe"], 8.5)
arrow(7.5, 11.75, 7.5, 11.5, ls="--", color=C["mut"])
diamond(7.5, 10.1, 3.8, 1.35, "IDENTIFY intent\n(+ confidence)", C["router"])
arrow(7.5, 10.9, 7.5, 10.78)

# intent fan-out
yI = 8.3
lanes = [
    (1.7,  "New\nappointment", C["gather"]),
    (4.3,  "Reschedule /\nCancel", C["gather"]),
    (6.9,  "Question /\nPricing", C["gather"]),
    (9.5,  "Complaint /\nMessage", C["gather"]),
    (12.9, "Emergency /\nHuman", C["escalate"]),
]
for x, t, col in lanes:
    box(x, yI, 2.25, 0.9, t, col, 9)
    arrow(7.5, 9.42, x, yI+0.48, color="#a8a29e")

# booking lane
box(1.7, 6.9, 2.4, 0.8, "QUALIFY\ntype·screen·provider", C["gather"], 8.2)
box(1.7, 5.7, 2.4, 0.7, "check_availability", C["tool"], 8.8)
box(1.7, 4.6, 2.4, 0.7, "offer real slots\n→ contact → confirm", C["gather"], 8)
box(1.7, 3.5, 2.4, 0.7, "submit_booking\n(reference SL-XXXX)", C["act"], 8.3)
for a,b in [(7.85,7.3),(6.5,6.05),(5.35,4.95),(4.25,3.85)]:
    arrow(1.7, a, 1.7, b)

# reschedule/cancel
box(4.3, 6.5, 2.4, 0.9, "verify identity →\nreschedule / cancel", C["act"], 8.2)
arrow(4.3, yI-0.48, 4.3, 6.98)
# question
box(6.9, 6.5, 2.4, 0.9, "grounded answer\n· else take message", C["tool"], 8.2)
arrow(6.9, yI-0.48, 6.9, 6.98)
# complaint/message
box(9.5, 6.5, 2.4, 0.9, "de-escalate ladder\n· log_lead", C["act"], 8.2)
arrow(9.5, yI-0.48, 9.5, 6.98)
# emergency/human
box(12.9, 6.5, 2.4, 0.9, "log urgent →\ntransferCall", C["escalate"], 8.6)
arrow(12.9, yI-0.48, 12.9, 6.98)

# converge
box(7.5, 2.2, 5.4, 0.8, "CONFIRM  →  CLOSE", C["start"], 11)
for x, yb in [(1.7,3.15),(4.3,6.05),(6.9,6.05),(9.5,6.05),(12.9,6.05)]:
    arrow(x, yb, 7.5 + (-2 if x<7.5 else 2), 2.55, color="#c9c4ba", lw=1.5)

# ---- resilience band (the enterprise safety net) -------------------------
ax.add_patch(FancyBboxPatch((0.4, 0.35), 14.2, 0.95, boxstyle="round,pad=0.02,rounding_size=0.1",
             facecolor="#faf7f2", edgecolor="#e9e5dd", linewidth=1.3))
ax.text(0.75, 1.12, "RESILIENCE & SAFEGUARDS — every state recovers; the call never dead-ends",
        fontsize=9.5, fontweight="bold", color=C["safe"])
safe = ["disambiguate (low confidence)", "no-input recovery", "degraded mode (tool down → capture)",
        "spam screen", "waitlist / callback", "voicemail detect", "GDPR consent · PII guard"]
xs = [1.9, 3.9, 6.1, 8.1, 9.7, 11.3, 13.3]
for x, t in zip(xs, safe):
    ax.text(x, 0.66, "• " + t, ha="center", va="center", fontsize=7.6, color="#1c1917")

# external connections
box(1.7, 2.2, 2.5, 0.75, "Your BOOKING\nworkflow", C["ext"], 8.4, dashed=True)
arrow(1.7, 3.15, 1.7, 2.58, "payload", lx=0.95, color=C["ext"], lw=1.6)
box(12.9, 2.2, 2.9, 0.8, "Post-call automation\nCRM · SMS · follow-up", C["ext"], 8, dashed=True)
arrow(9.6, 2.2, 11.45, 2.2, "handoff", ly=0.3, color=C["ext"], lw=1.6)

items = [("Greet/Close", C["start"]), ("Router", C["router"]), ("Gather", C["gather"]),
         ("Tool", C["tool"]), ("Action", C["act"]), ("Escalate", C["escalate"]),
         ("Safeguard", C["safe"]), ("Connected", C["ext"])]
handles = [Line2D([0],[0], marker="s", color="w", markerfacecolor=c, markersize=11, label=l) for l,c in items]
ax.legend(handles=handles, loc="upper left", ncol=2, frameon=False, fontsize=8, bbox_to_anchor=(0.0, 1.02))

plt.savefig("workflow/receptionist-flow.png", dpi=150, bbox_inches="tight", facecolor="white")
print("saved workflow/receptionist-flow.png")
