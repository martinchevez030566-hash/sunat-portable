const { initDatabase, prepare } = require('../database/connection');

async function getDocuments(companyId, filters = {}, page = 1, limit = 50) {
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

  // 1. Contar total para paginación
  const countRes = prepare(`SELECT COUNT(*) as total FROM documents d WHERE ${whereStr}`).get(...params);
  
  // 2. Obtener registros
  const docs = prepare(`
    SELECT d.id, d.type, d.series, d.number, d.issue_date, d.client_name, d.client_ruc, d.total, d.currency, d.status
    FROM documents d 
    WHERE ${whereStr} 
    ORDER BY d.issue_date DESC, d.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { data: docs, total: countRes.total, page, limit, totalPages: Math.ceil(countRes.total / limit) };
}

module.exports = { getDocuments };