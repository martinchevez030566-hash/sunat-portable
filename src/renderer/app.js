document.addEventListener('DOMContentLoaded', async () => {
  console.log('🟢 [App] Renderizado iniciado');
  const api = window.sunatAPI;
  const els = {
    versionBadge: document.getElementById('version-badge'),
    storageBadge: document.getElementById('storage-badge'),
    companySwitcher: document.getElementById('company-switcher'),
    wizardContainer: document.getElementById('wizard-container'),
    menuItems: document.querySelectorAll('.menu-item'),
    viewSections: document.querySelectorAll('.view-section')
  };

  // 1. Garantizar DB lista
  await api.db.ensureReady();
  if (els.versionBadge) els.versionBadge.textContent = await api.getVersion();
  if (els.storageBadge) els.storageBadge.textContent = (await api.storage.getMode()) === 'ReadOnly' ? '🔒 Solo Lectura' : '💾 Lectura/Escritura';

  // 2. Leer setup_completed
  const raw = await api.settings.get('setup_completed');
  const setupCompleted = (raw === null || raw === undefined) ? '0' : String(raw);
  console.log(`🔍 [App] setup_leído="${setupCompleted}"`);

  // 3. Controlar flujo Wizard / App Principal
  if (setupCompleted === '1') {
    els.wizardContainer.style.display = 'none';
    initMenuRouter();
    initCompanySwitcher(api);
    navigateTo('view-dashboard');
  } else {
    document.body.style.overflow = 'hidden'; // Bloquear scroll durante wizard
    if (typeof setupWizard !== 'undefined') setupWizard.init();
    // Al finalizar wizard, recargar para inicializar UI completa
    window.addEventListener('wizard:completed', () => {
      document.body.style.overflow = '';
      location.reload();
    }, { once: true });
  }

  // Router de Menús
  function initMenuRouter() {
    els.menuItems.forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });
  }

  window.navigateTo = function(viewId) {
    els.viewSections.forEach(v => v.style.display = 'none');
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
    els.menuItems.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    
    // Inicializar componentes específicos al mostrar vista
    if (viewId === 'view-companies' && typeof companyMaintenance !== 'undefined') companyMaintenance.load();
    if (viewId === 'view-documents' && typeof documentList !== 'undefined') {
      const activeId = els.companySwitcher?.value;
      if (activeId) documentList.init(parseInt(activeId));
    }
  };

  function initCompanySwitcher(api) {
    if (typeof companySwitcher !== 'undefined') {
      companySwitcher.init();
      companySwitcher.bind();
      els.companySwitcher?.addEventListener('change', async (e) => {
        const newId = parseInt(e.target.value, 10);
        if (newId) {
          await api.company.setActive(newId);
          document.dispatchEvent(new CustomEvent('company:changed', { detail: { companyId: newId } }));
        }
      });
    }
  }
});