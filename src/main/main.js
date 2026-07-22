/**
 * main.js — Electron 메인 프로세스 (ESM)
 * 윈도우 생성 + 쇼파일 저장/불러오기 IPC.
 */
import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import dgram from 'node:dgram';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0b0d10',
    title: 'MA3 Simulator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // 간단 메뉴 (한/영)
  const menu = Menu.buildFromTemplate([
    {
      label: 'MA3 Sim',
      submenu: [
        { role: 'reload', label: '새로고침 / Reload' },
        { role: 'toggleDevTools', label: '개발자도구 / DevTools' },
        { type: 'separator' },
        { role: 'quit', label: '종료 / Quit' },
      ],
    },
    {
      label: '보기 / View',
      submenu: [
        { role: 'resetZoom', label: '확대 초기화 / Reset Zoom' },
        { role: 'zoomIn', label: '확대 / Zoom In' },
        { role: 'zoomOut', label: '축소 / Zoom Out' },
        { role: 'togglefullscreen', label: '전체화면 / Fullscreen' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

// ── IPC: 쇼파일 저장 ─────────────────────────
ipcMain.handle('show:save', async (_e, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '쇼파일 저장 / Save Show',
    defaultPath: 'ma3-show.json',
    filters: [{ name: 'MA3 Show', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  await fs.writeFile(filePath, data, 'utf-8');
  return { ok: true, path: filePath };
});

// ── IPC: 쇼파일 불러오기 ─────────────────────
ipcMain.handle('show:load', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '쇼파일 불러오기 / Load Show',
    properties: ['openFile'],
    filters: [{ name: 'MA3 Show', extensions: ['json'] }],
  });
  if (canceled || !filePaths.length) return { ok: false };
  const data = await fs.readFile(filePaths[0], 'utf-8');
  return { ok: true, data };
});

// ── IPC: 외부 링크를 기본 브라우저로 ─────────────
ipcMain.handle('open-external', async (_e, url) => {
  if (/^https?:\/\//i.test(url)) await shell.openExternal(url);
  return { ok: true };
});

// ── OSC (UDP) 수신 서버 ───────────────────────────
let oscSocket = null;

/** 최소 OSC 파서: 단일 메시지(주소 + ,타입태그 + 인자 f/i/s). 번들은 첫 메시지만. */
function parseOsc(buf) {
  let o = 0;
  const readStr = () => {
    let end = o; while (end < buf.length && buf[end] !== 0) end++;
    const s = buf.toString('ascii', o, end);
    o = (end + 1 + 3) & ~3; // null + 4바이트 패딩
    return s;
  };
  if (buf[0] === 0x23) return null; // '#bundle' 미지원(단순화)
  const address = readStr();
  if (address[0] !== '/') return null;
  let types = '';
  if (buf[o] === 0x2c) types = readStr().slice(1); // ',ffs' → 'ffs'
  const args = [];
  for (const t of types) {
    if (t === 'f') { args.push(buf.readFloatBE(o)); o += 4; }
    else if (t === 'i') { args.push(buf.readInt32BE(o)); o += 4; }
    else if (t === 's') { args.push(readStr()); }
  }
  return { address, args };
}

ipcMain.handle('osc:start', async (_e, port) => {
  try {
    if (oscSocket) { try { oscSocket.close(); } catch { /* */ } oscSocket = null; }
    const sock = dgram.createSocket('udp4');
    sock.on('message', (msg) => {
      try {
        const parsed = parseOsc(msg);
        if (parsed && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('osc-message', parsed);
      } catch { /* ignore malformed */ }
    });
    await new Promise((resolve, reject) => {
      sock.once('error', reject);
      sock.bind(port || 8000, () => resolve());
    });
    oscSocket = sock;
    return { ok: true, port: port || 8000 };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('osc:stop', async () => {
  if (oscSocket) { try { oscSocket.close(); } catch { /* */ } oscSocket = null; }
  return { ok: true };
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
