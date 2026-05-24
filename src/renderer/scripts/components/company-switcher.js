const companySwitcher = {
  el: null,

  async init() {
    this.el = document.getElementById('company-switcher');
    if (!this.el) {
      console.warn('⚠️ [Switcher] #company-switcher no encontrado en el DOM. Se omite carga.');
      return;
    }
    await this.loadCompanies();
  },

  async loadCompanies() {
    if (!this.el) return; // Guard defensivo
    try {
      const res = await window.sunatAPI.company.getAll();
      if (!res.success || !res.data?.length) {
        this.el.innerHTML = '<option value="">⚠️ No hay empresas</option>';
        return;
      }

      this.el.innerHTML = '<option value="">Seleccionar empresa...</option>' + 
        res.data.map(c => `<option value="${c.id}">${c.name} (${c.ruc})</option>`).join('');

      const activeId = await window.sunatAPI.company.getActiveId();
      console.log(`🎯 [Switcher] activeId: ${activeId}`);
      if (activeId) this.el.value = activeId;
    } catch (err) {
      console.error('❌ [Switcher] Error cargando:', err);
      this.el.innerHTML = '<option value="">❌ Error</option>';
    }
  },

  bind() {
    if (!this.el) return;
    this.el.addEventListener('change', async (e) => {
      const newId = parseInt(e.target.value, 10);
      if (isNaN(newId)) return; // Ignorar placeholder
      await window.sunatAPI.company.setActive(newId);
      document.dispatchEvent(new CustomEvent('company:changed', { detail: { companyId: newId } }));
    });
  }
};