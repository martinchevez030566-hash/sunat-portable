document.addEventListener('DOMContentLoaded', async () => {
  console.log('🟢 [App] Renderizado iniciado');
  const els = {
    versionBadge: document.getElementById('version-badge'),
    storageBadge: document.getElementById('storage-badge'),
    wizardContainer: document.getElementById('wizard-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    docTableBody: document.getElementById('doc-table-body')
  };
  const api = window.sunatAPI;

  try {
    if (els.versionBadge) els.versionBadge.textContent = await api.getVersion();
    if (els.storageBadge) {
      els.storageBadge.textContent = (await api.storage.getMode()) === 'ReadOnly' ? '🔒 Solo Lectura' : '💾 Lectura/Escritura';
    }

    let setupCompleted = '0';
    const raw = await api.settings.get('setup_completed');
    setupCompleted = (raw === null || raw === undefined) ? '0' : String(raw);
    console.log(`🔍 [App] setup_leído="${setupCompleted}" | setup_esperado="1"`);

    if (setupCompleted === '1') {
      console.log('✅ [App] Condición cumplida → Mostrando Dashboard');
      els.wizardContainer.style.display = 'none';
      els.dashboardContainer.style.display = 'block';

      if (typeof companySwitcher !== 'undefined') {
        await companySwitcher.init();
        companySwitcher.bind();
      }

      let activeId = await api.company.getActiveId();
      if (!activeId) {
        const all = await api.company.getAll();
        if (all.success && all.data?.length) {
          activeId = all.data[0].id;
          await api.company.setActive(activeId);
        }
      }

      if (activeId && typeof documentList !== 'undefined') {
        await documentList.init(activeId);
      } else if (els.docTableBody) {
        els.docTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b">📥 Selecciona empresa arriba</td></tr>`;
      }

      document.addEventListener('company:changed', async (e) => {
        if (typeof documentList !== 'undefined') await documentList.init(e.detail.companyId);
      });

    } else {
      console.log('⚙️ [App] Condición NO cumplida → Mostrando Wizard');
      els.wizardContainer.style.display = 'block';
      els.dashboardContainer.style.display = 'none';
      if (typeof setupWizard !== 'undefined') setupWizard.init();
    }
  } catch (err) {
    console.error('❌ [App]', err.message);
    if (els.dashboardContainer) {
      els.dashboardContainer.innerHTML = `<div class="card" style="border:2px solid #ef4444"><h3>Error</h3><p>${err.message}</p><button class="btn-primary" onclick="location.reload()">Reintentar</button></div>`;
    }
  }
});