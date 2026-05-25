const { initDatabase, queryRow, queryAll } = require('../database/connection');

async function getDocuments(companyId, filters = {}, page = 1, limit = 20) {
  await initDatabase();
  if (!companyId) return { success: false, error: 'company_id es obligatorio', data: [], total: 0, page: 1, totalPages: 1 };

  try {
    // 1. Verificar que la tabla exista
    const tableCheck = queryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'");
    if (!tableCheck) {
      console.warn('⚠️ [DocService] Tabla documents no existe. Ejecuta bootstrap primero.');
      return { success: true, data: [], total: 0, page: 1, totalPages: 1 };
    }

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

    const whereStr = where.join(' AND ');
    const offset = (page - 1) * limit;

    // 2. Contar total
    const countRes = queryRow(`SELECT COUNT(*) as total FROM documents d WHERE ${whereStr}`, params);
    const total = countRes?.total || 0;

    // 3. Obtener registros
    const docs = queryAll(`
      SELECT d.id, d.type, d.series, d.number, d.issue_date, d.client_name, d.client_ruc, d.total, d.currency, d.status
      FROM documents d 
      WHERE ${whereStr} 
      ORDER BY d.issue_date DESC, d.id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return {
      success: true,
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  } catch (err) {
    console.error('❌ [DocService] Error consultando documentos:', err.message);
    return { success: false, error: err.message, data: [], total: 0, page, totalPages: 1 };
  }
}

module.exports = { getDocuments };