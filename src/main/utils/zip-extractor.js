const AdmZip = require('adm-zip');

function extractZipInMemory(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const extracted = [];

    for (const entry of entries) {
      const name = entry.entryName.toLowerCase();
      // Ignorar carpetas, thumbs.db y metadatos de SO
      if (entry.isDirectory || name.includes('__macosx') || name.includes('.ds_store')) continue;
      if (!name.endsWith('.xml') && !name.endsWith('.pdf')) continue;

      extracted.push({
        name: entry.entryName.split('/').pop(),
        type: name.endsWith('.xml') ? 'xml' : 'pdf',
        buffer: entry.getData()
      });
    }

    return { success: true, files: extracted };
  } catch (err) {
    return { success: false, error: `Error extrayendo ZIP: ${err.message}` };
  }
}

module.exports = { extractZipInMemory };