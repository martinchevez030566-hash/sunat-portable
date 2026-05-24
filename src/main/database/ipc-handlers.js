const { ipcMain } = require('electron');
const { initDatabase, prepare } = require('./database/connection');
const { needsBootstrap, runBootstrap } = require('./database/bootstrap');
const { createCompany, getAllActiveCompanies } = require('./services/company-service');

function registerIpcHandlers() {
  console.log('   📡 Registrando handlers IPC...');

  // App
  ipcMain.handle('app:get-version', async () => '1.0.0');

  // DB/Bootstrap
  ipcMain.handle('db:needs-bootstrap', async () => needsBootstrap());
  ipcMain.handle('db:run-bootstrap', async () => {
    try { return await runBootstrap(); }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Storage
  ipcMain.handle('storage:get-mode', async () => {
    const { mode } = await initDatabase();
    return mode;
  });

  // Companies
  ipcMain.handle('company:create', async (event, data) => {
    try { return await createCompany(data); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('company:get-all', async () => {
    try { return { success: true, data: await getAllActiveCompanies() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Settings
  ipcMain.handle('settings:get', async (event, key) => {
    await initDatabase();
    const stmt = prepare('SELECT value FROM app_settings WHERE key = ?');
    const res = stmt.get(key);
    return res ? res.value : null;
  });

  ipcMain.handle('settings:update', async (event, { key, value }) => {
    await initDatabase();
    const stmt = prepare('UPDATE app_settings SET value = ?, updated_at = datetime("now") WHERE key = ?');
    stmt.run(String(value), key);
    return { success: true };
  });

  console.log('   ✅ Handlers IPC listos.');
}

module.exports = { registerIpcHandlers };