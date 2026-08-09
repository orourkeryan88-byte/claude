import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

C = {"onboard":"#7c3aed","chan":"#0ea5e9","recep":"#2563eb","tool":"#0891b2",
     "act":"#10b981","cal":"#7c3aed","auto":"#f59e0b","sms":"#0ea5e9","crm":"#4f46e5","mut":"#64748b"}

fig, ax = plt.subplots(figsize=(16, 12.4))
ax.set_xlim(0, 16); ax.set_ylim(0, 12.6); ax.axis("off")
fig.patch.set_facecolor("white")

def band(y, h, label, color):
    ax.add_patch(FancyBboxPatch((0.4, y), 15.2, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                 facecolor="#f8fafc", edgecolor="#e2e8f0", linewidth=1.4))
    ax.text(0.7, y+h-0.3, label, fontsize=12.5, fontweight="bold", color=color, va="center")

def box(x, y, w, h, text, color, fs=10):
    ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02,rounding_size=0.1",
                 facecolor=color, edgecolor="none"))
    ax.text(x, y, text, ha="center", va="center", color="white", fontsize=fs, fontweight="bold")

def arr(x1,y1,x2,y2,color="#94a3b8",lw=2.4,label=None):
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle="-|>",mutation_scale=18,linewidth=lw,color=color,shrinkA=3,shrinkB=3))
    if label: ax.text((x1+x2)/2+0.25,(y1+y2)/2,label,fontsize=9,fontweight="bold",color="#0f172a")

ax.text(8, 12.2, "Southline AI Receptionist — Everything it does", ha="center", fontsize=18, fontweight="bold", color="#0f172a")

# ---------------- BAND A: ONBOARD ----------------
band(10.7, 1.5, "1 · ONBOARD A CLIENT  (one-time, automatic)", C["onboard"])
ax.text(0.7, 10.95, "sign up → pay → the system sets them up", fontsize=9, color=C["mut"])
xs=[2.4,4.7,7.0,9.5,12.0,14.2]
labelsA=["Create account","Pay €350 +\n€80/month","Scan their\nwebsite","Build the AI\nassistant","Buy + assign\na number","Welcome pack\n+ login"]
for i,(x,t) in enumerate(zip(xs,labelsA)):
    box(x,11.35,2.0,0.78,t,C["onboard"],8.6)
    if i<len(xs)-1: arr(x+1.0,11.35,xs[i+1]-1.0,11.35)

# ---------------- BAND B: LIVE — the receptionist ----------------
band(5.9, 4.4, "2 · EVERY CALL OR CHAT  (the AI receptionist, 24/7)", C["recep"])
# channels in
box(2.2, 9.2, 2.2, 0.8, "Phone call\n(forwarded)", C["chan"], 9)
box(2.2, 8.1, 2.2, 0.8, "Website chat\nwidget", C["chan"], 9)
# brain
box(7.0, 8.65, 4.6, 1.5, "AI RECEPTIONIST\nGreet → Identify → Understand\n→ Act → Confirm → Close", C["recep"], 10.5)
arr(3.3, 9.2, 4.7, 8.9); arr(3.3, 8.1, 4.7, 8.4)
# tools
ax.text(7.0, 7.55, "uses tools:", ha="center", fontsize=9, color=C["mut"], fontstyle="italic")
toolset=[("Knowledge\n(from website)",5.1),("Check\navailability",6.55),("Book\nappointment",8.0),("Capture\nlead",9.45)]
for t,x in toolset: box(x,7.0,1.35,0.7,t,C["tool"],7.8); arr(7.0,7.9,x,7.35,color="#cbd5e1",lw=1.4)
# outcomes (right)
box(12.7, 9.25, 2.6, 0.78, "Books → Google Calendar", C["cal"], 9)
box(12.7, 8.35, 2.6, 0.78, "Answers FAQ / takes message", C["recep"], 8.6)
box(12.7, 7.45, 2.6, 0.78, "Transfers to a human", C["act"], 9)
box(12.7, 6.55, 2.6, 0.78, "Flags emergencies", "#ef4444", 9)
for yy in [9.25,8.35,7.45,6.55]: arr(9.3,8.65,11.4,yy,color="#cbd5e1",lw=1.6)

arr(8, 5.9, 8, 5.45, lw=2.8)

# ---------------- BAND C: AFTER (automation) ----------------
band(3.5, 2.1, "3 · AFTER EACH CONTACT  (automatic follow-through)", C["auto"])
labelsC=[("Log to the CRM",2.4,C["auto"]),("Text the owner\n(urgent flagged)",4.7,C["sms"]),
         ("Caller gets\nconfirmation",7.0,C["sms"]),("Reminder\nday before",9.3,C["sms"]),
         ("Follow-up +\nreview after",11.6,C["sms"]),("Daily 6pm\nsummary",13.9,C["auto"])]
for t,x,col in labelsC: box(x,4.15,2.05,0.82,t,col,8.6)

arr(8, 3.5, 8, 3.05, lw=2.8)

# ---------------- BAND D: CRM ----------------
band(1.2, 2.0, "4 · THE OWNER'S DASHBOARD  (CRM — phone + web leads in one place)", C["crm"])
labelsD=[("Inbox &\npipeline",2.4),("Appointments",4.7),("Insights\n(€ recovered)",7.0),
         ("Copilot\n(draft replies)",9.3),("Per-client\nsecure login",11.6),("Live sync\nfrom the line",13.9)]
for t,x in labelsD: box(x,1.85,2.05,0.82,t,C["crm"],8.6)

plt.savefig("assets/system-map.png", dpi=150, bbox_inches="tight", facecolor="white")
print("saved assets/system-map.png")
