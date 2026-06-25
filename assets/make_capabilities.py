import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

BG="#070b14"; CARD="#111a2e"; LINE="#1e2a44"; INK="#eaf0ff"; MUT="#8da2c7"
BRAND="#3b82f6"; BRAND2="#22d3ee"; GOOD="#34d399"

fig, ax = plt.subplots(figsize=(13, 9.6))
fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
ax.set_xlim(0, 12); ax.set_ylim(0, 10); ax.axis("off")

# header
ax.text(0.5, 9.45, "Southline AI Receptionist", fontsize=26, fontweight="bold", color=INK, va="center")
ax.text(0.5, 8.9, "Answers every call · books appointments · captures every lead — 24/7, for a tenth of the cost",
        fontsize=12.5, color=BRAND2, va="center")

cards = [
    ("ON THE CALL", BRAND2, [
        "Answers every call, 24/7 — never misses one",
        "Sounds human; knows the business inside out",
        "Books, reschedules, cancels, takes messages",
        "Handles questions, complaints & emergencies",
        "Transfers to a human when needed",
    ]),
    ("BOOKING & CALENDAR", GOOD, [
        "Checks real availability in Google Calendar",
        "\"Tomorrow at 10?\" -> checks that exact time",
        "If taken: offers 11, asks for another time",
        "Books the event + confirms it back",
        "Qualifies the booking (type, notes, location)",
    ]),
    ("AFTER EVERY CALL", "#f59e0b", [
        "Texts the owner the lead (urgent flagged)",
        "Logs it to the CRM automatically",
        "Texts the caller a confirmation",
        "Follows up next day if not booked",
        "Daily summary to the owner each evening",
    ]),
    ("CRM DASHBOARD", "#a78bfa", [
        "Tracks every call: who & the problem",
        "Who to call back, by urgency & status",
        "Drag-and-drop pipeline + appointments",
        "Notes, one-tap call-back, live feed",
    ]),
    ("FOR THE AGENCY", "#34d399", [
        "One template -> any client in ~10 min",
        "One system serves every client",
        "Fully rebrandable per business",
        "A fraction of a 25-30k/yr receptionist",
    ]),
    ("TO SELL IT", "#22d3ee", [
        "Live phone-call demo (works offline)",
        "Rebrand live to a prospect's name",
        "Export a deployable config on the spot",
        "Missed-call ROI calculator to close",
    ]),
]

cols, rows = 3, 2
x0, y0 = 0.5, 0.7
cw, ch = 3.75, 3.7
gx, gy = 0.13, 0.35
top = 8.3

for i, (title, col, items) in enumerate(cards):
    r = i // cols; c = i % cols
    x = x0 + c * (cw + gx)
    y = top - r * (ch + gy) - ch
    ax.add_patch(FancyBboxPatch((x, y), cw, ch, boxstyle="round,pad=0.03,rounding_size=0.12",
                 facecolor=CARD, edgecolor=LINE, linewidth=1.4))
    # accent bar
    ax.add_patch(FancyBboxPatch((x+0.18, y+ch-0.55), 0.5, 0.12, boxstyle="round,pad=0.01,rounding_size=0.05",
                 facecolor=col, edgecolor="none"))
    ax.text(x+0.18, y+ch-0.32, title, fontsize=12.5, fontweight="bold", color=col, va="center")
    ty = y + ch - 0.95
    for it in items:
        ax.text(x+0.30, ty, "•", fontsize=11, color=col, va="center")
        ax.text(x+0.52, ty, it, fontsize=10.3, color=INK, va="center")
        ty -= 0.52

ax.text(0.5, 0.28, "See it live:  orourkeryan88-byte.github.io/relier-/receptionist",
        fontsize=11, color=BRAND2, va="center", fontweight="bold")
ax.text(11.5, 0.28, "Southline · 085 174 0783", fontsize=10.5, color=MUT, va="center", ha="right")

plt.savefig("assets/capabilities-sheet.png", dpi=150, bbox_inches="tight", facecolor=BG)
print("saved assets/capabilities-sheet.png")
