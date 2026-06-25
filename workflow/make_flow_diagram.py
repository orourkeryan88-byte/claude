import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D

C = {"trigger": "#16a34a", "process": "#2563eb", "decision": "#f59e0b",
     "tool": "#0ea5e9", "act": "#7c3aed", "escalate": "#ef4444", "ext": "#0f766e"}

fig, ax = plt.subplots(figsize=(13, 11))
ax.set_xlim(0, 14); ax.set_ylim(0, 15); ax.axis("off")

def box(x, y, w, h, text, color, fs=10.5, dashed=False):
    p = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02,rounding_size=0.16",
                       linewidth=(1.6 if dashed else 0), facecolor=color, alpha=0.96,
                       edgecolor="#0f172a", linestyle=("--" if dashed else "-"))
    ax.add_patch(p)
    ax.text(x, y, text, ha="center", va="center", color="white", fontsize=fs, fontweight="bold")

def diamond(x, y, w, h, text, color):
    ax.add_patch(plt.Polygon([(x,y+h/2),(x+w/2,y),(x,y-h/2),(x-w/2,y)], closed=True, facecolor=color))
    ax.text(x, y, text, ha="center", va="center", color="white", fontsize=10, fontweight="bold")

def arrow(x1,y1,x2,y2,label=None,lx=0,ly=0,color="#334155"):
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle="-|>",mutation_scale=16,
                 linewidth=2,color=color,shrinkA=3,shrinkB=3))
    if label:
        ax.text((x1+x2)/2+lx,(y1+y2)/2+ly,label,ha="center",va="center",fontsize=9.5,
                fontweight="bold",color="#0f172a",bbox=dict(boxstyle="round,pad=0.2",fc="white",ec="#cbd5e1"))

ax.text(7, 14.5, "AI Receptionist — In-Call Workflow", ha="center", fontsize=16, fontweight="bold", color="#0f172a")

cx = 7
box(cx, 13.5, 4.4, 0.9, "GREET", C["trigger"], 12)
diamond(cx, 12.0, 3.6, 1.5, "IDENTIFY intent", C["decision"])
arrow(cx, 13.05, cx, 12.75)

# intent fan-out row
y_int = 10.2
cols = [
    (2.0,  "New\nappointment", C["process"]),
    (4.6,  "Reschedule /\nCancel", C["process"]),
    (7.0,  "Question /\nPricing", C["process"]),
    (9.4,  "Complaint /\nMessage", C["process"]),
    (12.0, "Emergency /\nHuman", C["escalate"]),
]
for x, t, col in cols:
    box(x, y_int, 2.2, 0.95, t, col, 9.5)
    arrow(cx, 11.25, x, y_int+0.5)

# New appointment lane -> qualify -> book -> submit
box(2.0, 8.6, 2.3, 0.85, "QUALIFY\n(type, screening,\nlocation, requests)", C["process"], 8.3)
box(2.0, 7.2, 2.3, 0.8, "check_availability", C["tool"], 9)
box(2.0, 5.9, 2.3, 0.8, "submit_booking", C["act"], 9.5)
arrow(2.0, y_int-0.5, 2.0, 9.05)
arrow(2.0, 8.15, 2.0, 7.6)
arrow(2.0, 6.8, 2.0, 6.3)

# reschedule/cancel -> manage_appointment
box(4.6, 7.2, 2.3, 0.9, "verify identity\n+ manage_appointment", C["act"], 8.3)
arrow(4.6, y_int-0.5, 4.6, 7.7)

# question -> answer_faq / take message
box(7.0, 7.2, 2.3, 0.9, "answer from\nknowledge / log_lead", C["tool"], 8.6)
arrow(7.0, y_int-0.5, 7.0, 7.7)

# complaint/message -> log_lead
box(9.4, 7.2, 2.3, 0.9, "log_lead\n(message / complaint)", C["act"], 8.6)
arrow(9.4, y_int-0.5, 9.4, 7.7)

# emergency/human -> transfer
box(12.0, 7.2, 2.3, 0.9, "transferCall\nto a human", C["escalate"], 9)
arrow(12.0, y_int-0.5, 12.0, 7.7)

# converge to confirm + close
box(cx, 4.0, 4.4, 0.9, "CONFIRM  →  CLOSE", C["trigger"], 12)
for x in [2.0, 4.6, 7.0, 9.4, 12.0]:
    yb = 5.5 if x == 2.0 else 6.75
    arrow(x, yb, cx-1.6 if x < cx else cx+1.6, 4.35, color="#94a3b8")

# external connections (dashed)
box(2.0, 4.0, 2.6, 1.0, "Your BOOKING\nworkflow\n(booking_reference)", C["ext"], 9, dashed=True)
arrow(2.0, 5.5, 2.0, 4.5, "booking-payload.json\nstatus: pending", lx=1.7, ly=0.0, color=C["ext"])
box(11.8, 4.0, 2.8, 1.0, "Post-call automation\n(CRM · SMS · calendar\n· follow-up)", C["ext"], 8.5, dashed=True)
arrow(cx+2.2, 4.0, 10.4, 4.0, "handoff payload", ly=0.35, color=C["ext"])

items = [("Greet/Close", C["trigger"]), ("Decision", C["decision"]), ("Gather", C["process"]),
         ("Tool", C["tool"]), ("Action", C["act"]), ("Escalate", C["escalate"]), ("Connected workflow", C["ext"])]
handles = [Line2D([0],[0], marker="s", color="w", markerfacecolor=c, markersize=12, label=l) for l,c in items]
ax.legend(handles=handles, loc="lower center", ncol=4, frameon=False, fontsize=9, bbox_to_anchor=(0.5, -0.04))

plt.tight_layout()
plt.savefig("workflow/receptionist-flow.png", dpi=150, bbox_inches="tight", facecolor="white")
print("saved workflow/receptionist-flow.png")
