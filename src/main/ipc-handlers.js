console.log('🆕 IPC-HANDLERS LOADED: BUILD 2026-05-24-FINAL');
const { ipcMain, dialog } = require('electron');
const { initDatabase, queryRow, queryAll, run, saveDatabase, closeDatabase, dbInstance } = require('./database/connection');
const { needsBootstrap, runBootstrap } = require('./database/bootstrap');
const { createCompany, getCompanyById, updateCompany, getAllActiveCompanies, updateActiveCompanyId, getActiveCompanyId, toggleCompanyActive } = require('./services/company-service');
const { getDocuments } = require('./services/document-service');
const fs = require('fs');
const path = require('path');

function registerIpcHandlers() {
  console.log('📡 [IPC] Registrando handlers...');
  ipcMain.handle('db:ensure-ready', async () => { await initDatabase(); return { success: true }; });
  ipcMain.handle('app:get-version', async () => '1.0.0');
  ipcMain.handle('db:needs-bootstrap', async () => needsBootstrap());
  ipcMain.handle('db:run-bootstrap', async () => { try { return await runBootstrap(); } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('db:repair', async () => {
    try {
      const dbPath = path.resolve(__dirname, '../../../data/facturas.db');
      closeDatabase();
      if (fs.existsSync(dbPath)) fs.renameSync(dbPath, `${dbPath}.repair.${Date.now()}.bak`);
      return await runBootstrap();
    } catch(err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('storage:get-mode', async () => { const { mode } = await initDatabase(); return mode; });
  ipcMain.handle('settings:get', async (ev, key) => { await initDatabase(); const r = queryRow('SELECT value FROM app_settings WHERE key = ?', [key]); return r?.value ?? null; });
  ipcMain.handle('settings:update', async (ev, { key, value }) => { await initDatabase(); dbInstance.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))", [key, String(value)]); saveDatabase(); return { success: true }; });
  
  ipcMain.handle('company:create', async (ev, data) => { try { return await createCompany(data); } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('company:get-by-id', async (ev, id) => { try { return { success: true, data: await getCompanyById(id) }; } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('company:update', async (ev, data) => { try { return await updateCompany(data); } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('company:get-all', async () => { try { return { success: true, data: await getAllActiveCompanies() }; } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('company:set-active', async (ev, id) => { try { return await updateActiveCompanyId(id); } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('company:get-active-id', async () => { try { return await getActiveCompanyId(); } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('company:toggle-active', async (ev, payload) => { try { return await toggleCompanyActive(payload); } catch(e) { return { success: false, error: e.message }; } });
  ipcMain.handle('documents:get', async (ev, p) => { try { return await getDocuments(p.companyId, p.filters, p.page, p.limit); } catch(e) { return { success: false, error: e.message }; } });

  ipcMain.handle('dialog:select-image', async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }] });
      if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      if (buffer.length > 500 * 1024) return { success: false, error: 'Imagen > 500KB no permitida' };
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.png' ? 'image/png' : 'image/jpeg');
      return { success: true, data: `data:${mime};base64,${buffer.toString('base64')}` };
    } catch (err) { return { success: false, error: err.message }; }
  });

  console.log('✅ [IPC] TODOS los handlers registrados.');
}
module.exports = { registerIpcHandlers };