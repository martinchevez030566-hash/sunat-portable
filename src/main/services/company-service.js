const { initDatabase, queryRow, queryAll, run, saveDatabase } = require('../database/connection');

async function createCompany(data) {
  await initDatabase();
  const { name, ruc, address, phone, email, web, logo } = data;
  if (!name || !ruc) throw new Error('Nombre y RUC son obligatorios');
  if (!/^\d{11}$/.test(ruc)) throw new Error('RUC debe tener 11 dígitos');

  try {
    run(`INSERT INTO companies (name, ruc, address, phone, email, web, logo_path, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`, 
        [name, ruc, address||'', phone||'', email||'', web||'', logo||'']);
    saveDatabase();
    const res = queryRow('SELECT last_insert_rowid() as id');
    return { success: true, id: res.id };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: companies.ruc')) throw new Error('⚠️ Ya existe una empresa con este RUC.');
    throw err;
  }
}

async function getAllActiveCompanies() {
  await initDatabase();
  return queryAll('SELECT id, name, ruc, logo_path, is_active FROM companies ORDER BY name');
}

async function updateActiveCompanyId(companyId) {
  await initDatabase();
  run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('active_company_id', ?, datetime('now'))", [String(companyId)]);
  saveDatabase();
  return { success: true };
}

async function getActiveCompanyId() {
  await initDatabase();
  const res = queryRow("SELECT value FROM app_settings WHERE key='active_company_id'");
  if (!res || !res.value) return null;
  return isNaN(parseInt(res.value, 10)) ? null : parseInt(res.value, 10);
}

async function toggleCompanyActive({ id, status }) {
  await initDatabase();
  run('UPDATE companies SET is_active = ?, updated_at = datetime("now") WHERE id = ?', [status, id]);
  saveDatabase();
  return { success: true };
}

module.exports = { createCompany, getAllActiveCompanies, updateActiveCompanyId, getActiveCompanyId, toggleCompanyActive };