const { contextBridge, ipcRenderer } = require('electron');

// Aquí iremos exponiendo funciones seguras al frontend
contextBridge.exposeInMainWorld('sunatAPI', {
  getVersion: () => 'v1.0.0',
  // Ejemplo futuro: getDocuments: () => ipcRenderer.invoke('get-documents')
});