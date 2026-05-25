const exportUI = {
  elements: {},
  initialized: false,

  init() {
    if (this.initialized) return;
    this.elements = {
      btnExport: document.getElementById('btn-export-csv'),
      companySwitcher: document.getElementById('company-switcher')
    };
    if (!this.elements.btnExport) return console.warn('⚠️ [ExportUI] Botón no encontrado');
    this.initialized = true;
    this.bindEvents();
    console.log('✅ [ExportUI] Listo');
  },

  bindEvents() {
    this.elements.btnExport.addEventListener('click', () => this.handleExport());
  },

  async handleExport() {
    const btn = this.elements.btnExport;
    const companyId = parseInt(this.elements.companySwitcher?.value, 10);
    if (!companyId) return alert('⚠️ Selecciona una empresa primero');

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Generando...';

    try {
      // Capturar filtros activos
      const filters = {
        from: document.getElementById('filter-from')?.value || '',
        to: document.getElementById('filter-to')?.value || '',
        type: document.getElementById('filter-type')?.value || '',
        search: document.getElementById('filter-search')?.value.trim() || ''
      };

      const res = await window.sunatAPI.export.generate({ companyId, filters });
      if (!res.success) throw new Error(res.error);

      // Disparar descarga automática
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `SUNAT_Report_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ [Export] Archivo descargado correctamente');
    } catch (err) {
      console.error('❌ [Export]', err);
      alert('❌ Error al exportar: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
};

window.exportUI = exportUI;