const { contextBridge, ipcRenderer } = require('electron');
console.log('🌉 [Preload] Inicializando puente...');

contextBridge.exposeInMainWorld('sunatAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  db: { ensureReady: () => ipcRenderer.invoke('db:ensure-ready'), needsBootstrap: () => ipcRenderer.invoke('db:needs-bootstrap'), runBootstrap: () => ipcRenderer.invoke('db:run-bootstrap'), repair: () => ipcRenderer.invoke('db:repair') },
  storage: { getMode: () => ipcRenderer.invoke('storage:get-mode') },
  settings: { get: (k) => ipcRenderer.invoke('settings:get', k), update: (d) => ipcRenderer.invoke('settings:update', d) },
  company: { create: (d) => ipcRenderer.invoke('company:create', d), getById: (id) => ipcRenderer.invoke('company:get-by-id', id), update: (d) => ipcRenderer.invoke('company:update', d), getAll: () => ipcRenderer.invoke('company:get-all'), setActive: (id) => ipcRenderer.invoke('company:set-active', id), getActiveId: () => ipcRenderer.invoke('company:get-active-id'), toggleActive: (d) => ipcRenderer.invoke('company:toggle-active', d) },
    documents: { 
    get: (p) => ipcRenderer.invoke('documents:get', p), 
    getById: (id) => ipcRenderer.invoke('document:get-by-id', id) // ✅ NUEVO
  },
  ingest: { process: (data) => ipcRenderer.invoke('ingest:process', data) },
  export: { generate: (data) => ipcRenderer.invoke('export:generate', data) },
  dashboard: { getStats: (id) => ipcRenderer.invoke('dashboard:get-stats', id) }, // ✅ NUEVO
  dialog: { selectImage: () => ipcRenderer.invoke('dialog:select-image') }
});
console.log('✅ [Preload] API expuesta.');