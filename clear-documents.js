const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'facturas.db');

(async () => {
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Base de datos no encontrada en:', DB_PATH);
    process.exit(1);
  }

  console.log('🗑️ Iniciando limpieza de documentos...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  try {
    // 1. Respaldo de seguridad automático
    const backupPath = `${DB_PATH}.backup.before_clear.${Date.now()}.bak`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`📦 Respaldo creado: ${path.basename(backupPath)}`);

    // 2. Eliminar en orden correcto (por integridad referencial)
    db.run('DELETE FROM document_items;');
    console.log('✅ document_items vaciada');

    db.run('DELETE FROM documents;');
    console.log('✅ documents vaciada');

    db.run('DELETE FROM ingest_logs;');
    console.log('✅ ingest_logs vaciada');

    // 3. Resetear autoincrementos (para que los IDs empiecen de nuevo en 1)
    db.run('DELETE FROM sqlite_sequence WHERE name IN ("documents", "document_items", "ingest_logs");');
    console.log('🔢 Secuencias de IDs reseteadas');

    // 4. Guardar cambios atómicamente
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, Buffer.from(db.export()));
    fs.renameSync(tmpPath, DB_PATH);
    console.log('💾 Cambios guardados en disco');

    // 5. Verificación final
    const countDocs = db.exec('SELECT COUNT(*) as total FROM documents')[0]?.values[0]?.[0] || 0;
    console.log(`🔍 Verificación: documents tiene ${countDocs} registros (esperado: 0)`);

  } catch (err) {
    console.error('❌ Error durante la limpieza:', err.message);
  } finally {
    db.close();
    process.exit(0);
  }
})();