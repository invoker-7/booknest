// VECTOR desktop — หน้าต่างเดียวที่เปิดหลังบ้าน (/admin) ของเว็บร้านที่ deploy แล้ว (ไม่มีโค้ดร้านซ้ำอยู่ในแอป)
// แอปนี้สำหรับผู้ดูแลเท่านั้น: หน้าร้านไม่เปิดในแอป และบัญชีที่ไม่ใช่ admin เข้าไม่ได้
// ที่อยู่เว็บตั้งใน config.json หรือ env VECTOR_URL ตอนพัฒนา
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const SITE_URL = (process.env.VECTOR_URL || require("./config.json").url).replace(/\/+$/, "");
const ORIGIN = new URL(SITE_URL).origin;
const ADMIN_URL = `${SITE_URL}/admin`;

// ส่วนของเว็บร้านที่แอปเปิดได้: หลังบ้าน, หน้าเข้าสู่ระบบ (+ ปลายทาง OAuth) และ API ที่สองส่วนนี้เรียก
const ADMIN_AREA = /^\/(admin|login|auth\/callback|api)(\/|$)/;

// หน้านอกเว็บร้านที่ต้องเปิดในหน้าต่างแอปเอง: Supabase (OAuth + ลิงก์ดาวน์โหลด) และหน้ายินยอมของ Google
const IN_APP_HOSTS = [/\.supabase\.co$/, /^accounts\.google\.[a-z.]+$/, /^accounts\.youtube\.com$/];

function parse(target) {
  try {
    return new URL(target);
  } catch {
    return null;
  }
}

/** หน้าของเว็บร้านที่อยู่นอกหลังบ้าน (หน้าร้าน, ตะกร้า, บัญชีลูกค้า ฯลฯ) */
function isStorePage(target) {
  const url = parse(target);
  return Boolean(url) && url.origin === ORIGIN && !ADMIN_AREA.test(url.pathname);
}

function staysInApp(target) {
  const url = parse(target);
  if (!url) return false;
  if (url.protocol === "file:") return true;
  if (url.origin === ORIGIN) return ADMIN_AREA.test(url.pathname);
  return url.protocol === "https:" && IN_APP_HOSTS.some((host) => host.test(url.hostname));
}

/**
 * กำลังอยู่กลางการเข้าสู่ระบบบนหน้าของผู้ให้บริการภายนอก (Google หรือ SSO ขององค์กรที่ Google ส่งต่อไป)
 * ขั้นตอนพวกนี้ส่งฟอร์มข้ามโดเมนที่แอปไม่รู้จักล่วงหน้า — ถ้าโยนไปเบราว์เซอร์ของเครื่องกลางทาง ข้อมูลฟอร์มกับ cookie จะหาย
 */
function midSignIn(current, target) {
  const from = parse(current);
  return Boolean(from) && /^https?:$/.test(from.protocol) && from.origin !== ORIGIN && /^https?:/.test(target);
}

function openOutside(target) {
  if (/^(https?|mailto):/.test(target)) void shell.openExternal(target);
}

let win = null;

/** ผู้ใช้ของ session ในแอป — null เมื่อไม่ได้ล็อกอินหรือถามเว็บไม่ได้ */
async function currentUser(session) {
  try {
    const res = await session.fetch(`${SITE_URL}/api/auth/me`, { cache: "no-store" });
    return res.ok ? (await res.json()).user : null;
  } catch {
    return null;
  }
}

async function signOut(session) {
  await session.fetch(`${SITE_URL}/api/auth/logout`, { method: "POST" }).catch(() => {});
  // เผื่อเว็บตอบไม่ได้: ลบ cookie ของร้านในแอปเองด้วย
  await session.clearStorageData({ origin: ORIGIN, storages: ["cookies"] }).catch(() => {});
}

let leaving = false;

/**
 * แอปกำลังจะออกไป (หรือออกไปแล้ว) ที่หน้าร้าน — เว็บพาไปเองได้สามกรณี:
 * admin กดลิงก์ไปหน้าร้าน, บัญชีที่ไม่ใช่ admin ถูกพาออกจาก /admin, หรือเพิ่งออกจากระบบ
 */
async function leftAdminArea(target) {
  if (leaving || !win) return;
  leaving = true;
  try {
    const { webContents } = win;
    const user = await currentUser(webContents.session);
    if (!win) return;

    if (user && !user.isAdmin) {
      await signOut(webContents.session);
      if (win) await win.loadFile(path.join(__dirname, "denied.html"), { query: { to: ADMIN_URL, email: user.email || "" } });
      return;
    }

    if (user) openOutside(target); // admin อยากดูหน้าร้าน -> เบราว์เซอร์ของเครื่อง
    const onStore = isStorePage(webContents.getURL());
    if (user && !onStore) return; // ยังอยู่ในหลังบ้าน ไม่ต้องทำอะไรต่อ
    // admin ที่หน้าร้านขึ้นมาในหน้าต่างแล้ว (เว็บเปลี่ยนหน้าเองโดยไม่โหลดใหม่) -> ย้อนกลับหลังบ้าน
    // ยังไม่ล็อกอิน -> เปิดหลังบ้านใหม่ เว็บจะพาไปหน้าเข้าสู่ระบบ
    const history = webContents.navigationHistory;
    if (user && history.canGoBack()) history.goBack();
    else await webContents.loadURL(ADMIN_URL);
  } catch {
    // โหลดไม่สำเร็จ did-fail-load แสดงหน้าแจ้งให้แล้ว
  } finally {
    leaving = false;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: "VECTOR Admin",
    backgroundColor: "#F4F3EF",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  const { webContents } = win;

  // ลิงก์ที่ขอเปิดหน้าต่างใหม่: ของหลังบ้านให้เปิดในหน้าต่างเดิม ที่เหลือส่งให้เบราว์เซอร์ของเครื่อง
  webContents.setWindowOpenHandler(({ url }) => {
    if (staysInApp(url)) void webContents.loadURL(url);
    else openOutside(url);
    return { action: "deny" };
  });

  webContents.on("will-navigate", (event, url) => {
    if (staysInApp(url)) return;
    if (!isStorePage(url) && midSignIn(webContents.getURL(), url)) return;
    event.preventDefault();
    if (isStorePage(url)) void leftAdminArea(url);
    else openOutside(url);
  });

  // เว็บ redirect ออกจากหลังบ้านเอง เช่น บัญชีที่ไม่ใช่ admin ถูกส่งไป /account
  webContents.on("will-redirect", (event, url, _isInPlace, isMainFrame) => {
    if (!isMainFrame || !isStorePage(url)) return;
    event.preventDefault();
    void leftAdminArea(url);
  });

  // เว็บเปลี่ยนหน้าด้วย history API (ลิงก์ของ Next) ไม่ผ่าน will-navigate — ตรวจหลังเปลี่ยนแล้ว
  webContents.on("did-navigate-in-page", (_event, url, isMainFrame) => {
    if (isMainFrame && isStorePage(url)) void leftAdminArea(url);
  });

  // ต่อเว็บไม่ได้ (ไม่มีเน็ต / เว็บล่ม) -> หน้าแจ้งในแอป พร้อมปุ่มลองใหม่
  webContents.on("did-fail-load", (_event, code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = ยกเลิกเอง เช่น เริ่มดาวน์โหลดไฟล์
    void win.loadFile(path.join(__dirname, "offline.html"), { query: { to: ADMIN_URL } });
  });

  win.on("closed", () => {
    win = null;
  });

  void win.loadURL(ADMIN_URL);
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
          { label: "Home", accelerator: "CmdOrCtrl+Shift+H", click: nav((wc) => wc.loadURL(ADMIN_URL)) },
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
