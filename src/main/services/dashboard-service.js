const { initDatabase, queryRow } = require('../database/connection');

async function getDashboardStats(companyId) {
  await initDatabase();
  if (!companyId) return { invoices: 0, receipts: 0, total: 0 };

  console.log(`🔍 [SERVICE] Recibido companyId: ${companyId} | Tipo: ${typeof companyId}`);
  const limaDate = "date('now', '-5 hours')";

  try {
    const invoicesRes = queryRow(
      `SELECT COUNT(*) as total FROM documents WHERE company_id = ? AND type = 'FACTURA' AND date(created_at) = ${limaDate}`,
      [companyId]
    );
    console.log(`📦 [SERVICE] Raw DB Invoices:`, invoicesRes);

    const receiptsRes = queryRow(
      `SELECT COUNT(*) as total FROM documents WHERE company_id = ? AND type = 'BOLETA' AND date(created_at) = ${limaDate}`,
      [companyId]
    );
    console.log(`📦 [SERVICE] Raw DB Receipts:`, receiptsRes);

    const moneyRes = queryRow(
      `SELECT SUM(total) as total FROM documents WHERE company_id = ? AND type IN ('FACTURA', 'BOLETA') AND date(created_at) = ${limaDate}`,
      [companyId]
    );
    console.log(`📦 [SERVICE] Raw DB Money:`, moneyRes);

    const result = {
      invoices: invoicesRes?.total || 0,
      receipts: receiptsRes?.total || 0,
      total: moneyRes?.total || 0
    };
    console.log(`✅ [SERVICE] Retornando al IPC:`, result);
    return result;
  } catch (err) {
    console.error('❌ [SERVICE] Error:', err);
    return { invoices: 0, receipts: 0, total: 0 };
  }
}
module.exports = { getDashboardStats };