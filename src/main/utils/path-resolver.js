const path = require('path');
const fs = require('fs');

// Resolver ruta raíz del proyecto de forma absoluta y estable
function getProjectRoot() {
  // Este archivo está en src/main/utils/
  // Subimos 3 niveles: utils -> main -> src -> raíz del proyecto
  const root = path.resolve(__dirname, '../../..');
  console.log(`📂 [PathResolver] Raíz del proyecto: ${root}`);
  return root;
}

function getAppDataPath() {
  const root = getProjectRoot();
  const dataPath = path.join(root, 'data');
  
  // Crear estructura de directorios si no existe
  const subDirs = ['data', 'data/logs', 'data/backups', 'data/temp'];
  subDirs.forEach(dir => {
    const fullPath = path.join(root, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 [PathResolver] Directorio creado: ${fullPath}`);
    }
  });
  
  return dataPath;
}

function getLogsPath() { return path.join(getAppDataPath(), 'logs'); }
function getBackupsPath() { return path.join(getAppDataPath(), 'backups'); }

module.exports = { getProjectRoot, getAppDataPath, getLogsPath, getBackupsPath };