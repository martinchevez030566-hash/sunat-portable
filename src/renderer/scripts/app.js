document.addEventListener('DOMContentLoaded', async () => {
  console.log('🟢 [App] Iniciando...');
  const api = window.sunatAPI;
  
  const els = {
    version: document.getElementById('version-badge'),
    storage: document.getElementById('storage-badge'),
    sidebar: document.getElementById('sidebar'),
    toggleBtn: document.getElementById('btn-toggle-sidebar'),
    menuItems: document.querySelectorAll('.menu-item'),
    views: document.querySelectorAll('.view-section'),
    wizard: document.getElementById('wizard-container'),
    statInvoices: document.getElementById('stat-invoices'),
    statReceipts: document.getElementById('stat-receipts'),
    statTotal: document.getElementById('stat-total')
  };

  async function refreshDashboard() {
    const switcher = document.getElementById('company-switcher');
    if (!switcher || !els.statInvoices) {
      console.warn('⚠️ [UI] Switcher o elementos DOM faltantes');
      return;
    }
    
    const companyId = parseInt(switcher.value, 10);
    console.log(`🖥️ [UI] Refresh Dashboard | companyId: ${companyId}`);
    
    if (!companyId) return;

    try {
      const stats = await api.dashboard.getStats(companyId);
      console.log(`📡 [UI] Datos recibidos:`, stats);

      els.statInvoices.textContent = stats.invoices;
      els.statReceipts.textContent = stats.receipts;
      els.statTotal.textContent = `S/ ${parseFloat(stats.total || 0).toFixed(2)}`;
      console.log('✅ [UI] DOM actualizado');
    } catch (err) {
      console.error('❌ [UI] Error en refreshDashboard:', err);
    }
  }

  // Listener seguro
  const switcher = document.getElementById('company-switcher');
  switcher?.addEventListener('change', refreshDashboard);

  try {
    await api.db.ensureReady();
    if (els.version) els.version.textContent = await api.getVersion();
    if (els.storage) els.storage.textContent = (await api.storage.getMode()) === 'ReadOnly' ? '🔒 Solo Lectura' : '💾 R/W';

    const raw = await api.settings.get('setup_completed');
    const setup = (raw === null || raw === undefined) ? '0' : String(raw);

    els.toggleBtn?.addEventListener('click', () => els.sidebar?.classList.toggle('collapsed'));

    window.navigateTo = (viewId) => {
      els.views.forEach(v => v.style.display = 'none');
      els.menuItems.forEach(b => b.classList.remove('active'));
      const target = document.getElementById(viewId);
      if (target) target.style.display = 'block';
      const btn = document.querySelector(`.menu-item[data-view="${viewId}"]`);
      if (btn) btn.classList.add('active');
      
      if (viewId === 'view-dashboard') {
        setTimeout(refreshDashboard, 150);
      }
      if (viewId === 'view-companies') companyMaintenance?.load();
      if (viewId === 'view-documents') {
        if (typeof ingestUI !== 'undefined') ingestUI.init();
        if (typeof exportUI !== 'undefined') exportUI.init();
        const cid = document.getElementById('company-switcher')?.value;
        if (cid) documentList?.init(parseInt(cid));
      }
    };

    els.menuItems.forEach(btn => btn.addEventListener('click', () => window.navigateTo(btn.dataset.view)));

    if (setup === '1') {
      console.log('✅ Dashboard mode');
      if (els.wizard) els.wizard.style.display = 'none';
      if (typeof companySwitcher !== 'undefined') { 
        await companySwitcher.init(); 
        companySwitcher.bind(); 
      }
      window.navigateTo('view-dashboard');
    } else {
      if (els.wizard) els.wizard.style.display = 'flex';
      if (typeof setupWizard !== 'undefined') setupWizard.init();
      window.addEventListener('wizard:completed', () => location.reload(), { once: true });
    }
  } catch (err) {
    console.error('❌ [App] Fatal:', err);
    if (els.wizard) els.wizard.style.display = 'none';
  }
});