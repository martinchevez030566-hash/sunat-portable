const companySwitcher = {
  el: null,
  async init() {
    this.el = document.getElementById('company-switcher');
    if (!this.el) return console.warn('⚠️ #company-switcher no encontrado');
    await this.load();
  },
  async load() {
    try {
      const res = await window.sunatAPI.company.getAll();
      if (!res.success || !res.data?.length) {
        this.el.innerHTML = '<option value="">⚠️ Sin empresas</option>';
        return;
      }
      this.el.innerHTML = '<option value="">Seleccionar...</option>' + 
        res.data.map(c => `<option value="${c.id}">${c.name} (${c.ruc})</option>`).join('');
      
      const activeId = await window.sunatAPI.company.getActiveId();
      if (activeId && this.el.querySelector(`option[value="${activeId}"]`)) this.el.value = activeId;
    } catch (err) { this.el.innerHTML = '<option value="">❌ Error</option>'; }
  },
  async refresh() {
    const current = this.el?.value;
    await this.load();
    if (current && this.el?.querySelector(`option[value="${current}"]`)) this.el.value = current;
    console.log('🔄 Switcher actualizado');
  },
  bind() {
    if (!this.el) return;
    this.el.addEventListener('change', async (e) => {
      const id = parseInt(e.target.value, 10);
      if (id) { await window.sunatAPI.company.setActive(id); document.dispatchEvent(new CustomEvent('company:changed', { detail: { companyId: id } })); }
    });
  }
};

// Exponer globalmente para que maintenance lo use
window.companySwitcher = companySwitcher;