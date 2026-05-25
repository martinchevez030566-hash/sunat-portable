const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'facturas.db');

(async () => {
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Base de datos no encontrada en:', DB_PATH);
    return;
  }

  console.log('🔍 === DEBUG DASHBOARD QUERIES ===\n');
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. Verificar si hay documentos y de qué empresas son
  const docs = db.exec("SELECT company_id, type, created_at, total FROM documents ORDER BY id DESC");
  
  if (!docs.length || !docs[0].values.length) {
    console.log('⚠️ La tabla "documents" está vacía.');
    db.close();
    return;
  }

  console.log('📄 ÚLTIMOS REGISTROS EN DB:');
  // Imprimir los primeros 3 para ver la estructura
  const header = docs[0].columns;
  const sampleRows = docs[0].values.slice(0, 3);
  
  sampleRows.forEach(row => {
    const obj = {};
    header.forEach((col, i) => obj[col] = row[i]);
    console.log(JSON.stringify(obj));
  });

  // Extraer IDs únicos de empresas que tienen documentos
  const companyIds = [...new Set(docs[0].values.map(r => r[0]))];
  console.log('\n🏢 EMPRESAS CON DATOS:', companyIds);

  // 2. Probar múltiples queries para CADA empresa encontrada
  for (const cid of companyIds) {
    console.log(`\n--- 🧪 PROBANDO PARA company_id = ${cid} ---`);
    
    const queries = [
      { name: '1. Básico (Tipo MAYÚSCULAS)', sql: `SELECT COUNT(*) FROM documents WHERE company_id = ${cid} AND type = 'FACTURA'` },
      { name: '2. Insensible a mayúsculas (LOWER)', sql: `SELECT COUNT(*) FROM documents WHERE company_id = ${cid} AND LOWER(type) = 'factura'` },
      { name: '3. Fecha UTC (date() hoy)', sql: `SELECT COUNT(*) FROM documents WHERE company_id = ${cid} AND type = 'FACTURA' AND date(created_at) = date('now')` },
      { name: '4. Fecha Lima (date() -5h)', sql: `SELECT COUNT(*) FROM documents WHERE company_id = ${cid} AND type = 'FACTURA' AND date(created_at) = date('now', '-5 hours')` },
      { name: '5. Fecha Lima (strftime mes)', sql: `SELECT COUNT(*) FROM documents WHERE company_id = ${cid} AND type = 'FACTURA' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-5 hours')` },
      { name: '6. Suma Total (Histórico)', sql: `SELECT SUM(total) FROM documents WHERE company_id = ${cid} AND type IN ('FACTURA', 'BOLETA')` }
    ];

    for (const q of queries) {
      try {
        const res = db.exec(q.sql);
        const val = res[0]?.values[0][0];
        const status = (val !== 0 && val !== null) ? '✅' : '0️⃣';
        console.log(`   ${status} ${q.name}: ${val}`);
      } catch (err) {
        console.log(`   ❌ ${q.name}: Error SQL`);
      }
    }
  }

  db.close();
  console.log('\n✅ Diagnóstico completado. Revisa qué query dio un número > 0.');
})();