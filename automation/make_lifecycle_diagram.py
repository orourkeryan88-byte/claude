import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

INK="#0f172a"; MUT="#475569"
COL={"book":"#7c3aed","confirm":"#10b981","remind":"#2563eb","follow":"#f59e0b"}

fig, ax = plt.subplots(figsize=(13, 5.4))
ax.set_xlim(0, 13); ax.set_ylim(0, 5.5); ax.axis("off")
ax.text(6.5, 5.1, "What the customer gets after booking", ha="center", fontsize=17, fontweight="bold", color=INK)

stages = [
    (1.7, "1. BOOKS",        COL["book"],    "On the call",        ["AI books the slot", "into Google Calendar"]),
    (4.6, "2. CONFIRMATION", COL["confirm"], "Instantly",          ["Text + email:", "“You’re booked for…”"]),
    (7.7, "3. REMINDER",     COL["remind"],  "Day before",         ["Text + email:", "“Reminder — see you", "tomorrow at 10”"]),
    (10.8,"4. FOLLOW-UP",    COL["follow"],  "Day after",          ["Text + email:", "“Thanks! Leave us", "a quick review”"]),
]
y=2.7; w=2.5; h=1.9
for i,(x,title,col,when,lines) in enumerate(stages):
    ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.03,rounding_size=0.14",
                 facecolor=col, edgecolor="none"))
    ax.text(x, y+h/2-0.32, title, ha="center", color="white", fontsize=12.5, fontweight="bold")
    ax.text(x, y+h/2-0.66, when, ha="center", color="white", fontsize=10, style="italic")
    ty=y+0.12
    for ln in lines:
        ax.text(x, ty, ln, ha="center", color="white", fontsize=9.6); ty-=0.36
    if i < len(stages)-1:
        nx=stages[i+1][0]
        ax.add_patch(FancyArrowPatch((x+w/2, y), (nx-w/2, y), arrowstyle="-|>",
                     mutation_scale=20, linewidth=2.4, color="#94a3b8"))

ax.text(6.5, 0.7, "Every step goes out by BOTH text and email · reminders & follow-ups run automatically",
        ha="center", fontsize=11.5, color=MUT, fontweight="bold")
ax.text(6.5, 0.3, "(Confirmation = post-call workflow · Reminder + Follow-up = appointment-reminders workflow)",
        ha="center", fontsize=9.5, color="#94a3b8")

plt.savefig("automation/appointment-lifecycle.png", dpi=150, bbox_inches="tight", facecolor="white")
print("saved automation/appointment-lifecycle.png")
