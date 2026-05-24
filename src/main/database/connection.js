const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { isStorageReadOnly } = require('../utils/storage-guard');

let SQL = null;
let dbInstance = null;
let dbMode = 'ReadWrite';
const DB_PATH = path.resolve(__dirname, '../../../data/facturas.db');

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  ['logs', 'backups', 'temp'].forEach(d => {
    const p = path.join(dir, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
}

async function initDatabase() {
  if (dbInstance) return { db: dbInstance, mode: dbMode };

  ensureDataDir();
  dbMode = isStorageReadOnly(path.dirname(DB_PATH)) ? 'ReadOnly' : 'ReadWrite';
  SQL = await initSqlJs({ locateFile: file => path.join(__dirname, 'sql-wasm', file) });

  console.log(`📍 [DB] Ruta: ${DB_PATH}`);

  try {
    if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 100) {
      const buffer = fs.readFileSync(DB_PATH);
      if (buffer.toString('utf8', 0, 15) !== 'SQLite format 3') throw new Error('Encabezado inválido');
      dbInstance = new SQL.Database(buffer);
      console.log(`✅ [DB] Cargada desde disco: ${fs.statSync(DB_PATH).size} bytes`);
    } else {
      dbInstance = new SQL.Database();
      console.log(`🆕 [DB] Nueva instancia en memoria`);
    }
  } catch (err) {
    console.warn(`⚠️ [DB] Fallo al cargar: ${err.message}. Respaldando.`);
    if (fs.existsSync(DB_PATH)) fs.renameSync(DB_PATH, `${DB_PATH}.corrupt.${Date.now()}.bak`);
    dbInstance = new SQL.Database();
  }

  // Auto-reparar esquema si falta app_settings
  const tables = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table'");
  const tableNames = tables[0]?.values.map(r => r[0]) || [];
  if (!tableNames.includes('app_settings')) {
    console.log('⚠️ [DB] Esquema incompleto. Aplicando schema.sql automáticamente...');
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      dbInstance.exec(fs.readFileSync(schemaPath, 'utf8'));
      saveDatabase();
      console.log('✅ [DB] Esquema aplicado y guardado.');
    }
  }

  // 🔍 DIAGNÓSTICO REAL: Volcar app_settings al cargar
  const allSettings = queryAll("SELECT key, value FROM app_settings");
  console.log('📊 [DIAG] app_settings en disco:', JSON.stringify(allSettings));

  return { db: dbInstance, mode: dbMode };
}

function saveDatabase() {
  if (!dbInstance || dbMode !== 'ReadWrite') return false;
  try {
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, Buffer.from(dbInstance.export()));
    fs.renameSync(tmpPath, DB_PATH);
    console.log(`💾 [DB] Escritura atómica exitosa: ${fs.statSync(DB_PATH).size} bytes`);
    return true;
  } catch (err) {
    console.error(`❌ [DB] Error crítico guardando: ${err.message}`);
    return false;
  }
}

function closeDatabase() {
  if (dbInstance) { saveDatabase(); dbInstance.close(); dbInstance = null; console.log('🔌 [DB] Cerrada'); }
}

// 🔑 CORRECCIÓN CRÍTICA: sql.js requiere stmt.step() antes de getAsObject()
function queryRow(sql, params = []) {
  if (!dbInstance) throw new Error('DB no inicializada');
  const stmt = dbInstance.prepare(sql);
  if (params.length) stmt.bind(params);
  let res = null;
  if (stmt.step()) res = stmt.getAsObject(); // ← Avanza a la primera fila
  stmt.free();
  return res;
}

function queryAll(sql, params = []) {
  if (!dbInstance) throw new Error('DB no inicializada');
  const stmt = dbInstance.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject()); // ← Itera filas correctamente
  stmt.free();
  return results;
}

function run(sql, params = []) {
  if (!dbInstance) throw new Error('DB no inicializada');
  const stmt = dbInstance.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.run();
  stmt.free();
  return true;
}

module.exports = { initDatabase, saveDatabase, closeDatabase, queryRow, queryAll, run, getDbPath: () => DB_PATH };