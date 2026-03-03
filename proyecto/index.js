const { app, BrowserWindow } = require('electron');
const path = require('path');

// Desactivar aceleración por hardware si el error persiste en Linux
// app.disableHardwareAcceleration();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Simulador de Sistema de Interconexión",
    resizable:false,
    maximizable:false,
    webPreferences: {
      // Importante para que tu renderer.js funcione sin restricciones
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.loadFile('index.html');

  // Abre las herramientas de desarrollo automáticamente para que veas tus logs
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});