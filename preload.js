const { contextBridge, ipcRenderer } = require('electron');
console.log('🌉 [Preload] Inicializando puente...');

contextBridge.exposeInMainWorld('sunatAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  db: { 
    ensureReady: () => ipcRenderer.invoke('db:ensure-ready'), 
    needsBootstrap: () => ipcRenderer.invoke('db:needs-bootstrap'), 
    runBootstrap: () => ipcRenderer.invoke('db:run-bootstrap'), 
    repair: () => ipcRenderer.invoke('db:repair') 
  },
  storage: { getMode: () => ipcRenderer.invoke('storage:get-mode') },
  settings: { get: (k) => ipcRenderer.invoke('settings:get', k), update: (d) => ipcRenderer.invoke('settings:update', d) },
  company: { 
    create: (d) => ipcRenderer.invoke('company:create', d), 
    getAll: () => ipcRenderer.invoke('company:get-all'), 
    setActive: (id) => ipcRenderer.invoke('company:set-active', id), 
    getActiveId: () => ipcRenderer.invoke('company:get-active-id'), 
    toggleActive: (d) => ipcRenderer.invoke('company:toggle-active', d) 
  },
  documents: { get: (p) => ipcRenderer.invoke('documents:get', p) },
  dialog: { selectImage: () => ipcRenderer.invoke('dialog:select-image') }
});
console.log('✅ [Preload] API expuesta.');