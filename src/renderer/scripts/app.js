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
    wizard: document.getElementById('wizard-container')
  };

  try {
    await api.db.ensureReady();
    if (els.version) els.version.textContent = await api.getVersion();
    if (els.storage) els.storage.textContent = (await api.storage.getMode()) === 'ReadOnly' ? '🔒 Solo Lectura' : '💾 R/W';

    const raw = await api.settings.get('setup_completed');
    const setup = (raw === null || raw === undefined) ? '0' : String(raw);
    console.log(`🔍 setup="${setup}"`);

    // Toggle Sidebar
    els.toggleBtn?.addEventListener('click', () => {
      els.sidebar?.classList.toggle('collapsed');
    });

    // Router de Vistas (CORREGIDO: usa display block/none directamente)
    window.navigateTo = (viewId) => {
      els.views.forEach(v => v.style.display = 'none');
      els.menuItems.forEach(b => b.classList.remove('active'));
      
      const target = document.getElementById(viewId);
      if (target) target.style.display = 'block';
      
      const btn = document.querySelector(`.menu-item[data-view="${viewId}"]`);
      if (btn) btn.classList.add('active');
      
      // Inicializar componentes al mostrar vista
      if (viewId === 'view-companies') companyMaintenance?.load();
      if (viewId === 'view-documents') {
        const cid = document.getElementById('company-switcher')?.value;
        if (cid) documentList?.init(parseInt(cid));
      }
    };

    // Bind clicks
    els.menuItems.forEach(btn => {
      btn.addEventListener('click', () => window.navigateTo(btn.dataset.view));
    });

    if (setup === '1') {
      console.log('✅ Dashboard mode');
      if (els.wizard) els.wizard.style.display = 'none';
      
      if (typeof companySwitcher !== 'undefined') {
        await companySwitcher.init();
        companySwitcher.bind();
      }
      window.navigateTo('view-dashboard');
    } else {
      console.log('⚙️ Wizard mode');
      if (els.wizard) els.wizard.style.display = 'flex';
      if (typeof setupWizard !== 'undefined') setupWizard.init();
      window.addEventListener('wizard:completed', () => location.reload(), { once: true });
    }
  } catch (err) {
    console.error('❌ [App]', err);
    if (els.wizard) els.wizard.style.display = 'none';
  }
});