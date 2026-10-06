// VECTOR desktop — หน้าต่างเดียวที่เปิดเว็บร้านที่ deploy แล้ว (ไม่มีโค้ดร้านซ้ำอยู่ในแอป)
// ที่อยู่เว็บตั้งใน config.json หรือ env VECTOR_URL ตอนพัฒนา
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const START_URL = (process.env.VECTOR_URL || require("./config.json").url).replace(/\/+$/, "");
const ORIGIN = new URL(START_URL).origin;

// หน้าเหล่านี้ต้องเปิดในหน้าต่างแอปเอง: เว็บร้าน, Supabase (OAuth + ลิงก์ดาวน์โหลด) และหน้ายินยอมของ Google
const IN_APP_HOSTS = [/\.supabase\.co$/, /^accounts\.google\.[a-z.]+$/, /^accounts\.youtube\.com$/];

function staysInApp(target) {
  try {
    const url = new URL(target);
    if (url.origin === ORIGIN || url.protocol === "file:") return true;
    return url.protocol === "https:" && IN_APP_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

function openOutside(target) {
  if (/^(https?|mailto):/.test(target)) void shell.openExternal(target);
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: "VECTOR",
    backgroundColor: "#F4F3EF",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  const { webContents } = win;

  // ลิงก์ที่ขอเปิดหน้าต่างใหม่: ของร้านให้เปิดในหน้าต่างเดิม ที่เหลือส่งให้เบราว์เซอร์ของเครื่อง
  webContents.setWindowOpenHandler(({ url }) => {
    if (staysInApp(url)) void webContents.loadURL(url);
    else openOutside(url);
    return { action: "deny" };
  });

  webContents.on("will-navigate", (event, url) => {
    if (staysInApp(url)) return;
    event.preventDefault();
    openOutside(url);
  });

  // ต่อเว็บไม่ได้ (ไม่มีเน็ต / เว็บล่ม) -> หน้าแจ้งในแอป พร้อมปุ่มลองใหม่
  webContents.on("did-fail-load", (_event, code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = ยกเลิกเอง เช่น เริ่มดาวน์โหลดไฟล์
    void win.loadFile(path.join(__dirname, "offline.html"), { query: { to: START_URL } });
  });

  win.on("closed", () => {
    win = null;
  });

  void win.loadURL(START_URL);
}

function buildMenu() {
  const nav = (fn) => () => win && fn(win.webContents);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      { role: "editMenu" },
      {
        label: "Go",
        submenu: [
          { label: "Home", accelerator: "CmdOrCtrl+Shift+H", click: nav((wc) => wc.loadURL(START_URL)) },
          { label: "Back", accelerator: "CmdOrCtrl+[", click: nav((wc) => wc.navigationHistory.canGoBack() && wc.navigationHistory.goBack()) },
          { label: "Forward", accelerator: "CmdOrCtrl+]", click: nav((wc) => wc.navigationHistory.canGoForward() && wc.navigationHistory.goForward()) },
          { type: "separator" },
          { role: "reload" },
        ],
      },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ])
  );
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
