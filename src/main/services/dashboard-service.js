const { initDatabase, queryRow } = require('../database/connection');

async function getDashboardStats(companyId) {
  await initDatabase();
  if (!companyId) {
    console.warn('⚠️ [Dashboard] companyId inválido');
    return { invoices: 0, receipts: 0, total: 0 };
  }

  console.log(`🔍 [Dashboard] Consultando stats para company_id=${companyId}`);
  const limaDate = "date('now', '-5 hours')";

  try {
    const invoicesRes = queryRow(
      `SELECT COUNT(*) as total FROM documents WHERE company_id = ? AND type = 'FACTURA' AND date(created_at) = ${limaDate}`,
      [companyId]
    );
    const receiptsRes = queryRow(
      `SELECT COUNT(*) as total FROM documents WHERE company_id = ? AND type = 'BOLETA' AND date(created_at) = ${limaDate}`,
      [companyId]
    );
    const moneyRes = queryRow(
      `SELECT SUM(total) as total FROM documents WHERE company_id = ? AND type IN ('FACTURA', 'BOLETA') AND date(created_at) = ${limaDate}`,
      [companyId]
    );

    const result = {
      invoices: invoicesRes?.total || 0,
      receipts: receiptsRes?.total || 0,
      total: moneyRes?.total || 0
    };
    console.log(`✅ [Dashboard] Retornando:`, result);
    return result;
  } catch (err) {
    console.error('❌ [Dashboard] Error SQL:', err.message);
    return { invoices: 0, receipts: 0, total: 0 };
  }
}
module.exports = { getDashboardStats };