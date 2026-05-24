const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./src/main/ipc-handlers');
const { closeDatabase } = require('./src/main/database/connection');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000, height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));
  console.log('🖥️ Ventana cargada');
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
  console.log('🛑 App cerrando... DB guardada');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});