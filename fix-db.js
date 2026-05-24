const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'facturas.db');

(async () => {
  if (!fs.existsSync(DB_PATH)) { console.log('❌ DB no encontrada. Ejecuta npm start primero.'); process.exit(1); }
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Forzar setup_completed = 1 y active_company_id = 1
  db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('setup_completed', '1'), ('active_company_id', '1')");
  
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, DB_PATH);
  db.close();
  
  console.log('✅ DB parcheada: setup_completed="1", active_company_id="1"');
  console.log('🚀 Ahora ejecuta: npm start');
})();