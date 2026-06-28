# Southline Owner Admin — desktop app

A native desktop app (Mac / Windows / Linux) that wraps your owner control centre —
clients, plans, discount codes, leads, pricing. Only you can open it, and it asks for
your admin password every time it can't find a saved session.

## Run it right now (no install)

```bash
cd admin-app
npm install
npm start
```

A window opens. Enter your **server address** (your Render URL) and your **admin
password** (the `ADMIN_PASSWORD` you set on the server) and you're in.

## Build an installer you can double-click

```bash
cd admin-app
npm install
npm run dist          # builds for whatever OS you're on
# or target one:
npm run dist:mac      # -> out/Southline Owner Admin-1.0.0.dmg
npm run dist:win      # -> out/Southline Owner Admin Setup 1.0.0.exe
```

The installer lands in `admin-app/out/`. Double-click it to install on your laptop like
any other app. It'll show up in your Applications / Start menu as **Southline Owner Admin**.

> Mac note: to install an unsigned app, right-click it → Open the first time (or
> System Settings → Privacy & Security → Open anyway). To ship it to others without that
> step you'd add an Apple Developer signing certificate — not needed for your own laptop.

## Keeping it up to date

The admin UI is bundled inside the app (`renderer/index.html`, a copy of `/admin`). When you
change the admin page, re-copy it and rebuild:

```bash
cp ../admin/index.html renderer/index.html
npm run dist
```

Or, to always load the latest hosted version instead of the bundle, launch with:

```bash
ADMIN_URL="https://orourkeryan88-byte.github.io/relier-/receptionist/admin/" npm start
```

## Security

- The app holds no secrets. It talks to your server with the admin token it gets after you
  log in, stored locally on your machine only.
- Anyone opening the app still needs your `ADMIN_PASSWORD` — keep that private; it's the key
  to the whole product.
