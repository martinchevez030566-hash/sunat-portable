const { initDatabase, queryAll } = require('../database/connection');

function generateCSV(rows, headers) {
  const escapeCSV = (val) => {
    const str = String(val ?? '');
    // Escape estándar CSV: comillas dobles internas, wrap si contiene punto y coma/saltos
    return /[;\"\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  
  const headerRow = headers.map(escapeCSV).join(';');
  const dataRows = rows.map(row => row.map(escapeCSV).join(';'));
  
  // UTF-8 BOM obligatorio para que Excel abra correctamente caracteres latinos y ñ
  return '\uFEFF' + [headerRow, ...dataRows].join('\n');
}

async function exportDocuments(companyId, filters = {}) {
  await initDatabase();
  if (!companyId) throw new Error('companyId es obligatorio');

  let where = ['d.company_id = ?'];
  let params = [companyId];

  if (filters.from) { where.push('d.issue_date >= ?'); params.push(filters.from); }
  if (filters.to)   { where.push('d.issue_date <= ?'); params.push(filters.to); }
  if (filters.type) { where.push('d.type = ?'); params.push(filters.type); }
  if (filters.search) {
    const s = `%${filters.search}%`;
    where.push('(d.client_name LIKE ? OR d.client_ruc LIKE ? OR d.series || d.number LIKE ?)');
    params.push(s, s, s);
  }

  const docs = queryAll(`
    SELECT d.id, d.type, d.series, d.number, d.issue_date, d.client_name, d.client_ruc, d.supplier_ruc, d.subtotal, d.igv, d.total, d.currency, d.status
    FROM documents d WHERE ${where.join(' AND ')} ORDER BY d.issue_date DESC, d.id DESC
  `, params);

  const headers = ['ID', 'Tipo', 'Serie', 'Número', 'Fecha Emisión', 'Cliente', 'RUC Cliente', 'RUC Proveedor', 'Subtotal', 'IGV', 'Total', 'Moneda', 'Estado'];
  
  const rows = docs.map(d => [
    d.id, 
    d.type, 
    d.series, 
    d.number,
    d.issue_date ? new Date(d.issue_date + 'T00:00:00').toLocaleDateString('es-PE') : '',
    d.client_name || '', 
    d.client_ruc || '', 
    d.supplier_ruc || '',
    parseFloat(d.subtotal || 0).toFixed(2), 
    parseFloat(d.igv || 0).toFixed(2), 
    parseFloat(d.total || 0).toFixed(2), 
    d.currency || 'PEN', 
    d.status || 'valid'
  ]);

  return generateCSV(rows, headers);
}

module.exports = { exportDocuments };