const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'facturas.db');

// Obtener ID desde la línea de comandos
const targetId = process.argv[2];

(async () => {
  console.log('🔍 Conectando a la base de datos...');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Error: No se encontró la DB en ${DB_PATH}`);
    process.exit(1);
  }

  if (!targetId || isNaN(parseInt(targetId))) {
    console.log('⚠️ Uso: node dump-raw-data.js <ID_REGISTRO>');
    console.log('Ejemplo: node dump-raw-data.js 2');
    process.exit(1);
  }

  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    // 🔑 Consulta filtrada por ID exacto
    const query = `SELECT * FROM documents WHERE id = ?`;
    const result = db.exec(query, [parseInt(targetId)]);

    if (result.length === 0 || result[0].values.length === 0) {
      console.log(`⚠️ No existe ningún documento con ID = ${targetId}`);
      db.close();
      process.exit(0);
    }

    const columns = result[0].columns;
    const values = result[0].values;

    console.log(`\n📄 REGISTRO SOLICITADO: ID = ${targetId}`);
    console.log('━'.repeat(40));

    // Convertir fila a objeto clave-valor
    const record = {};
    values[0].forEach((val, index) => {
      record[columns[index]] = val;
    });

    // Mostrar JSON crudo sin truncar
    console.log(JSON.stringify(record, null, 2));
    console.log('\n✅ Volcado completado.');

    db.close();
  } catch (err) {
    console.error('❌ Error al leer la DB:', err.message);
    process.exit(1);
  }
})();