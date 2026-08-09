# Website chat widget

The AI receptionist as a **website chat** — same brain as the phone agent, on a new channel. It greets visitors, answers questions, books appointments, and captures every lead 24/7. This is how you catch the leads leaking off a client's website, not just their phone.

## Try it
`chat/index.html` — open it, or pass a business via URL:

```
chat/index.html?business=Joe%27s%20Plumbing&type=plumber&area=Dublin&webhook=https://your-server.onrender.com
```

## Put it on a client's website (embed)

Drop this into their site (footer / before `</body>`). It opens the chat in a slide-up panel:

```html
<!-- Southline AI Receptionist chat -->
<iframe
  src="https://orourkeryan88-byte.github.io/relier-/receptionist/chat/?business=Joe%27s%20Plumbing&type=plumber&webhook=https://YOUR-SERVER"
  style="position:fixed;bottom:20px;right:20px;width:380px;height:560px;max-width:92vw;border:none;border-radius:16px;box-shadow:0 16px 50px rgba(0,0,0,.25);z-index:9999"
  title="Chat with us"></iframe>
```

(For a launcher button that toggles the iframe, wrap it in a tiny show/hide script — happy to generate that per client.)

## Config (URL params)

| Param | What |
|---|---|
| `business` | Business name shown in the header |
| `type` | e.g. `dental clinic`, `plumber` |
| `area` | Location |
| `hours` / `services` / `pricing` / `faq` | The knowledge it answers from |
| `webhook` | Your server base URL — leads POST to `/log-lead` and land in the CRM |

## What it does

- Greets + offers quick-reply chips (book / price / hours).
- Answers FAQs (price, hours, services, location, payment) from the config.
- Books: collects reason → name → phone → time, confirms, and **submits the lead** to your webhook (tagged `channel: web-chat`).
- Handles emergencies, cancellations, reschedules, and "talk to a person" by taking details for a callback.
- Falls back to taking a message for anything it can't answer.

Every lead flows into the **same CRM** as phone calls, so the owner sees web and phone leads in one inbox.
