// @ts-check
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

let appVersion = '1.0.1';
try {
  const possiblePaths = [
    path.join(__dirname, '../package.json'),
    path.join(__dirname, 'package.json'),
    path.join(process.cwd(), 'package.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (pkg && pkg.version) {
        appVersion = String(pkg.version).trim();
        break;
      }
    }
  }
} catch {}

// Expose safe API to the renderer process
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  version: appVersion,

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Persistent OS UserData Storage (Preserved across updates)
  saveUserData: serializedDb => ipcRenderer.invoke('storage:save-user-data', serializedDb),
  loadUserData: () => ipcRenderer.invoke('storage:load-user-data'),

  // Automatic Update System IPC
  getUpdaterInfo: () => ipcRenderer.invoke('updater:get-info'),
  checkForUpdates: options => ipcRenderer.invoke('updater:check', options),
  downloadUpdate: payload => ipcRenderer.invoke('updater:download', payload),
  installUpdate: payload => ipcRenderer.invoke('updater:install', payload),

  onUpdaterStatus: callback => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  onUpdaterProgress: callback => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('updater:progress', listener);
    return () => ipcRenderer.removeListener('updater:progress', listener);
  },

  // Thermal Printer & Label Printing IPC
  getPrinters: () => ipcRenderer.invoke('printer:list'),
  printHtml: payload => ipcRenderer.invoke('printer:print-html', payload),
});
