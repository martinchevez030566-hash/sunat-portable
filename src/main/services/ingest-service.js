const { initDatabase, queryRow, queryAll, run, saveDatabase, dbInstance } = require('../database/connection');
const { validateSunatDoc } = require('../utils/validators');

async function ingestDocuments(companyId, parsedFiles) {
  await initDatabase();
  const results = [];

  for (const file of parsedFiles) {
    const fileName = file.name;
    const parsedData = file.data;
    
    let status = 'pending';
    let documentId = null;
    let error = null;
    let warnings = [];

    try {
      // 1. Validar documento
      const validation = validateSunatDoc(parsedData, companyId);
      if (!validation.valid) {
        throw new Error(`Validación fallida: ${validation.errors.join('; ')}`);
      }
      warnings = validation.warnings;

      // 2. Verificar duplicados (serie + ruc + fecha + company_id)
      const existing = queryRow(
        `SELECT id FROM documents WHERE company_id = ? AND series = ? AND number = ? AND supplier_ruc = ?`,
        [companyId, parsedData.serieNumero?.split('-')[0] || '', parsedData.serieNumero?.split('-')[1] || '', parsedData.proveedorRuc]
      );
      
      if (existing) {
        status = 'duplicate';
        results.push({ name: fileName, status, documentId: existing.id, message: 'Documento ya registrado', warnings });
        continue;
      }

      // 3. Insertar documento (transacción manual con sql.js)
      const docRes = run(`
        INSERT INTO documents (
          company_id, type, series, number, issue_date, 
          supplier_ruc, supplier_name, client_ruc, client_name,
          subtotal, igv, total, currency, status,
          parsed_from, xml_hash, content_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        companyId,
        parsedData.tipo,
        parsedData.serieNumero?.split('-')[0] || '',
        parsedData.serieNumero?.split('-')[1] || parsedData.serieNumero || '',
        parsedData.fechaEmision || parsedData.fecha,
        parsedData.proveedorRuc,
        parsedData.proveedorNombre || '',
        parsedData.clienteRuc,
        parsedData.clienteNombre || 'CONSUMIDOR FINAL',
        parsedData.subtotal,
        parsedData.igv,
        parsedData.total,
        parsedData.moneda || 'PEN',
        'valid',
        fileName,
        null, // xml_hash (pendiente para v2)
        null, // content_hash
      ]);
      
      documentId = queryRow('SELECT last_insert_rowid() as id').id;

      // 4. Insertar ítems si existen
      if (parsedData.items?.length) {
        const itemStmt = dbInstance.prepare(`
          INSERT INTO document_items (document_id, line_number, description, quantity, unit, unit_price, total_line, tax_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of parsedData.items) {
          itemStmt.run([
            documentId,
            item.linea || 1,
            item.descripcion || 'S/D',
            item.cantidad || 1,
            item.unit || 'NIU',
            item.unitario || 0,
            item.totalLinea || 0,
            18.0 // IGV estándar Perú
          ]);
        }
        itemStmt.free();
      }

      // 5. Guardar cambios en disco
      saveDatabase();
      status = 'success';

    } catch (err) {
      status = 'error';
      error = err.message;
      console.error(`❌ [Ingest] ${fileName}: ${error}`);
    }

    // 6. Registrar en ingest_logs (siempre, éxito o error)
    try {
      run(`
        INSERT INTO ingest_logs (filename, type, status, error_message, document_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [fileName, parsedData.tipo || 'UNKNOWN', status, error, documentId]);
      saveDatabase();
    } catch (logErr) {
      console.warn(`⚠️ [Ingest] No se pudo registrar log para ${fileName}: ${logErr.message}`);
    }

    results.push({
      name: fileName,
      status,
      documentId,
      message: status === 'success' ? 'Registrado correctamente' : 
               status === 'duplicate' ? 'Ya existía en la base de datos' : 
               `Error: ${error}`,
      warnings
    });
  }

  return { success: true, results };
}

module.exports = { ingestDocuments };