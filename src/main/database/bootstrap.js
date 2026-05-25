const fs = require('fs');
const path = require('path');
const { initDatabase, exec, saveDatabase, queryRow, run, getDbPath } = require('./connection');

const CRITICAL_TABLES = ['companies', 'app_settings', 'documents'];

async function needsBootstrap() {
  try {
    await initDatabase();
    const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
    return CRITICAL_TABLES.some(t => !tables.includes(t));
  } catch { return true; }
}

async function runBootstrap() {
  console.log('🔄 [Bootstrap] Verificando integridad...');
  await initDatabase();

  const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
  const missing = CRITICAL_TABLES.filter(t => !tables.includes(t));

  if (missing.length > 0) {
    console.log(`📄 [Bootstrap] Creando esquema: ${missing.join(', ')}`);
    exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  }
try {
  queryRow("ALTER TABLE documents ADD COLUMN notes TEXT DEFAULT ''");
  console.log('✅ [Bootstrap] Columna notes agregada a documents');
} catch (e) {
  if (!e.message.includes('duplicate column')) console.warn('⚠️ [Bootstrap] notes ya existe:', e.message);
}
  // Verificar estado actual ANTES de insertar defaults
  const setupRes = queryRow("SELECT value FROM app_settings WHERE key='setup_completed'");
  const currentSetup = setupRes?.value;

  // Solo insertar si no existe
  const defaults = [
    ['active_company_id', ''],
    ['theme', 'light'], ['language', 'es'],
    ['auto_backup_on_close', '1'], ['default_page_size', '50'],
    ['schema_version', '1.0']
  ];
  
  defaults.forEach(([k, v]) => {
    run("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", [k, v]);
  });

  // Garantizar setup_completed si no existía
  if (!currentSetup) {
    run("INSERT INTO app_settings (key, value) VALUES ('setup_completed', '0')");
  }

  const saved = saveDatabase();
  console.log(`✅ [Bootstrap] Finalizado. setup="${saved ? 'OK' : 'FALLIDO'}"`);
  return { success: saved };
}

module.exports = { needsBootstrap, runBootstrap };