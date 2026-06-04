/**
 * main.js — Electron 메인 프로세스 (ESM)
 * 윈도우 생성 + 쇼파일 저장/불러오기 IPC.
 */
import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

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

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
