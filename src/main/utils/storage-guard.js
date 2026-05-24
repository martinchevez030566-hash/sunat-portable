const fs = require('fs');
const path = require('path');

function isStorageReadOnly(testDir) {
  const testFile = path.join(testDir, `.write_test_${Date.now()}.tmp`);
  try {
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);
    return false; // Escritura exitosa = ReadWrite
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM' || err.code === 'EROFS') {
      console.warn('⚠️ Almacenamiento detectado en modo SOLO LECTURA');
      return true;
    }
    return false; // Otros errores: asumimos escritura segura para evitar bloqueos
  }
}

module.exports = { isStorageReadOnly };