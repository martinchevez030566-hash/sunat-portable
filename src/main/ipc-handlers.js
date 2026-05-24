const { ipcMain } = require('electron');
const { initDatabase, queryRow, queryAll, run, saveDatabase, closeDatabase } = require('./database/connection');
const { needsBootstrap, runBootstrap } = require('./database/bootstrap');
const { createCompany, getAllActiveCompanies, updateActiveCompanyId, getActiveCompanyId } = require('./services/company-service');
const { getDocuments } = require('./services/document-service');
const fs = require('fs');
const path = require('path');

function registerIpcHandlers() {
  console.log('📡 [IPC] Registrando handlers...');

  ipcMain.handle('app:get-version', async () => '1.0.0');
  ipcMain.handle('db:needs-bootstrap', async () => needsBootstrap());
  ipcMain.handle('db:run-bootstrap', async () => runBootstrap());
  
  ipcMain.handle('db:repair', async () => {
    try {
      const dbPath = path.resolve(__dirname, '../../../data/facturas.db');
      closeDatabase();
      if (fs.existsSync(dbPath)) fs.renameSync(dbPath, `${dbPath}.repair.${Date.now()}.bak`);
      return await runBootstrap();
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('storage:get-mode', async () => {
    const { mode } = await initDatabase(); return mode;
  });

  // 🔍 LOG DETALLADO: settings:get
  ipcMain.handle('settings:get', async (event, key) => {
    await initDatabase();
    const res = queryRow('SELECT value FROM app_settings WHERE key = ?', [key]);
    console.log(`🔍 [IPC] settings:get("${key}") → "${res?.value ?? 'NULL'}"`);
    return res ? res.value : null;
  });

  // 🔍 LOG DETALLADO: settings:update con verificación post-escritura
  ipcMain.handle('settings:update', async (event, { key, value }) => {
    await initDatabase();
    console.log(`📝 [IPC] settings:update("${key}", "${value}") → Iniciando`);
    
    run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))", [key, String(value)]);
    const saved = saveDatabase();
    
    // VERIFICACIÓN INMEDIATA
    const verify = queryRow('SELECT value FROM app_settings WHERE key = ?', [key]);
    const verifiedValue = verify?.value ?? 'FALLO_LECTURA';
    console.log(`✅ [IPC] settings:update("${key}") → Guardado: ${saved} | Verificado en DB: "${verifiedValue}" | Esperado: "${value}"`);
    
    return { success: saved && verifiedValue === String(value) };
  });

  ipcMain.handle('company:create', async (event, data) => {
    try { return await createCompany(data); }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('company:get-all', async () => {
    try { return { success: true, data: await getAllActiveCompanies() }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('company:set-active', async (event, id) => {
    try { return await updateActiveCompanyId(id); }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('company:get-active-id', async () => {
    try { return await getActiveCompanyId(); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('documents:get', async (event, { companyId, filters, page, limit }) => {
    try { return await getDocuments(companyId, filters, page, limit); }
    catch (e) { return { success: false, error: e.message }; }
  });

  console.log('✅ [IPC] Handlers listos.');
}

module.exports = { registerIpcHandlers };