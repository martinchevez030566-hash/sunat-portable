const { contextBridge, ipcRenderer } = require('electron');

console.log('🌉 [Preload] Inicializando puente de seguridad...');

contextBridge.exposeInMainWorld('sunatAPI', {
  // App Info
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // Database & Bootstrap
  db: {
    ensureReady: () => ipcRenderer.invoke('db:ensure-ready'), // 🔑 AÑADIDO
    needsBootstrap: () => ipcRenderer.invoke('db:needs-bootstrap'),
    runBootstrap: () => ipcRenderer.invoke('db:run-bootstrap'),
    repair: () => ipcRenderer.invoke('db:repair')
  },

  // Storage
  storage: { 
    getMode: () => ipcRenderer.invoke('storage:get-mode') 
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    update: (data) => ipcRenderer.invoke('settings:update', data)
  },

  // Companies
  company: {
    create: (data) => ipcRenderer.invoke('company:create', data),
    getAll: () => ipcRenderer.invoke('company:get-all'),
    setActive: (id) => ipcRenderer.invoke('company:set-active', id),
    getActiveId: () => ipcRenderer.invoke('company:get-active-id')
  },

  // Documents
  documents: {
    get: (payload) => ipcRenderer.invoke('documents:get', payload)
  }
});

console.log('✅ [Preload] API expuesta en window.sunatAPI');