/**
 * Southline Owner Admin — desktop wrapper (Electron).
 * --------------------------------------------------
 * A native window around the owner admin page. It loads the admin UI bundled
 * inside the app (renderer/index.html), which then talks to your live server
 * (you enter the server address + admin password on first launch).
 *
 * Run in dev:   npm install && npm start
 * Build app:    npm run dist        (or dist:mac / dist:win)
 *               -> installer lands in admin-app/out/
 */
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

// If you'd rather always load the hosted page (latest version, needs internet),
// set this to your hosted admin URL and it'll load that instead of the bundle.
const HOSTED_URL = process.env.ADMIN_URL || "";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a1020",
    title: "Southline Owner Admin",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  if (HOSTED_URL) win.loadURL(HOSTED_URL);
  else win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // open external links (e.g. Stripe) in the real browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) { shell.openExternal(url); return { action: "deny" }; }
    return { action: "allow" };
  });
}

const menu = Menu.buildFromTemplate([
  { label: "Southline", submenu: [{ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "quit" }] },
  { label: "Edit", submenu: [{ role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
]);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
