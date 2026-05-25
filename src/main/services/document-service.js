const { initDatabase, queryRow, queryAll } = require('../database/connection');

async function getDocuments(companyId, filters = {}, page = 1, limit = 20) {
  await initDatabase();
  if (!companyId) throw new Error('company_id es obligatorio');

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

  const countRes = queryRow(`SELECT COUNT(*) as total FROM documents d WHERE ${whereStr}`, params);
  const total = countRes?.total || 0;

  const docs = queryAll(`
    SELECT d.id, d.type, d.series, d.number, d.issue_date, d.client_name, d.client_ruc, d.total, d.currency, d.status
    FROM documents d 
    WHERE ${whereStr} 
    ORDER BY d.issue_date DESC, d.id DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return {
    data: docs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1
  };
}

// 🔹 NUEVA FUNCIÓN: Obtener documento completo con ítems
async function getDocumentById(id) {
  await initDatabase();
  if (!id) throw new Error('id es obligatorio');

  const doc = queryRow(`
    SELECT d.*, c.name as company_name 
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    WHERE d.id = ?
  `, [id]);

  if (!doc) return null;

  const items = queryAll(`
    SELECT line_number, description, quantity, unit, unit_price, total_line
    FROM document_items
    WHERE document_id = ?
    ORDER BY line_number
  `, [id]);

  return { ...doc, items };
}

module.exports = { getDocuments, getDocumentById };