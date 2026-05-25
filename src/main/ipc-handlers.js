console.log('🆕 IPC-HANDLERS LOADED: BUILD DASHBOARD');
const { ipcMain } = require('electron');
const { initDatabase, queryRow, queryAll, run, saveDatabase, closeDatabase, dbInstance } = require('./database/connection');
const { needsBootstrap, runBootstrap } = require('./database/bootstrap');
const { createCompany, getCompanyById, updateCompany, getAllActiveCompanies, updateActiveCompanyId, getActiveCompanyId, toggleCompanyActive } = require('./services/company-service');
const { getDocuments } = require('./services/document-service');
const { getDashboardStats } = require('./services/dashboard-service'); // ✅ NUEVO
const { extractZipInMemory } = require('./utils/zip-extractor');
const { parseSunatXML } = require('./utils/xml-parser');
const { extractPdfData } = require('./utils/pdf-extractor');
const { exportDocuments } = require('./services/export-service');
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
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }] });
      if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      if (buffer.length > 500 * 1024) return { success: false, error: 'Imagen > 500KB' };
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.png' ? 'image/png' : 'image/jpeg');
      return { success: true, data: `data:${mime};base64,${buffer.toString('base64')}` };
    } catch (err) { return { success: false, error: err.message }; }
  });

  // 🔹 INGESTA
  ipcMain.handle('ingest:process', async (event, { files, companyId }) => {
    if (!companyId) return { success: false, error: 'companyId es obligatorio', results: [] };
    if (!files || files.length === 0) return { success: false, error: 'Sin archivos', results: [] };
    await initDatabase();
    const results = [];
    for (const file of files) {
      const fileName = file.name;
      let parsedData = null, status = 'pending', docId = null, errorMsg = null;
      try {
        const buffer = Buffer.from(file.data);
        if (fileName.toLowerCase().endsWith('.zip')) {
          const zipRes = extractZipInMemory(buffer);
          if (!zipRes.success) throw new Error(zipRes.error);
          const inner = zipRes.files.find(f => f.type === 'xml' || f.type === 'pdf');
          if (!inner) throw new Error('ZIP sin XML/PDF');
          parsedData = inner.type === 'xml' ? parseSunatXML(inner.buffer.toString('utf8')) : await extractPdfData(inner.buffer);
        } else if (fileName.toLowerCase().endsWith('.xml')) {
          parsedData = parseSunatXML(buffer.toString('utf8'));
        } else if (fileName.toLowerCase().endsWith('.pdf')) {
          parsedData = await extractPdfData(buffer);
        } else throw new Error('Formato no soportado');

        if (!parsedData?.success || !parsedData?.data) throw new Error(parsedData?.error || 'Parseo fallido');
        const d = parsedData.data;
        let issueDate = d.fechaEmision || d.fecha;
        if (issueDate && /^\d{2}\/\d{2}\/\d{4}$/.test(issueDate)) {
          const [dd, mm, yyyy] = issueDate.split('/');
          issueDate = `${yyyy}-${mm}-${dd}`;
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate || '')) {
          issueDate = new Date().toISOString().split('T')[0];
        }

        const finalSerie = d.serieNumero || '';
        const ruc = d.ruc || d.proveedorRuc || '';
        const dup = queryRow('SELECT id FROM documents WHERE company_id = ? AND series = ? AND supplier_ruc = ?', [companyId, finalSerie, ruc]);
        
        if (dup) { status = 'duplicate'; docId = dup.id; }
        else {
                    run(`INSERT INTO documents (company_id, type, series, number, issue_date, supplier_ruc, supplier_name, client_ruc, client_name, subtotal, igv, total, currency, status, parsed_from, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 hours'), datetime('now', '-5 hours'))`, 
            [companyId, d.tipo || 'OTRO', finalSerie, '', issueDate || '', ruc, d.proveedorNombre || '', d.clienteRuc || '', d.clienteNombre || '', d.subtotal || 0, d.igv || 0, d.total || 0, d.moneda || 'PEN', 'valid', fileName]);
           
          docId = queryRow('SELECT last_insert_rowid() as id').id;
          if (d.items?.length) {
            for (const item of d.items) run(`INSERT INTO document_items (document_id, line_number, description, quantity, unit, unit_price, total_line) VALUES (?, ?, ?, ?, ?, ?, ?)`, [docId, item.linea || 1, item.descripcion || 'S/D', item.cantidad || 1, item.unit || 'NIU', item.unitario || 0, item.totalLinea || 0]);
          }
          status = 'success';
        }
      } catch (err) { status = 'error'; errorMsg = err.message; console.warn(`⚠️ [Ingest] ${fileName}: ${errorMsg}`); }
      try { run('INSERT INTO ingest_logs (filename, status, error_message, document_id, created_at) VALUES (?, ?, ?, ?, datetime("now"))', [fileName, status, errorMsg, docId]); } catch(e) {}
      results.push({ name: fileName, status, documentId: docId, message: status === 'success' ? 'Guardado' : status === 'duplicate' ? 'Duplicado' : `Error: ${errorMsg}` });
    }
    saveDatabase();
    return { success: true, results };
  });

  // 🔹 EXPORTACIÓN
  ipcMain.handle('export:generate', async (event, { companyId, filters }) => {
    try {
      const csvContent = await exportDocuments(companyId, filters);
      return { success: true, csv: csvContent };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('dashboard:get-stats', async (event, companyId) => {
    console.log(`📡 [IPC] Llamada recibida. companyId: ${companyId}`);
    try {
      const stats = await getDashboardStats(companyId);
      console.log(`📡 [IPC] Enviando respuesta al renderer:`, stats);
      return stats;
    } catch (err) {
      console.error('❌ [IPC] Error en handler:', err.message);
      return { invoices: 0, receipts: 0, total: 0 };
    }
  });
  console.log('✅ [IPC] TODOS los handlers registrados.');
}
module.exports = { registerIpcHandlers };