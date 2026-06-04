/**
 * preload.cjs — 렌더러에 안전한 IPC 브릿지를 노출.
 * window.ma3.saveShow(jsonString) / window.ma3.loadShow()
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ma3', {
  saveShow: (data) => ipcRenderer.invoke('show:save', data),
  loadShow: () => ipcRenderer.invoke('show:load'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
