const companyMaintenance = {
  logoData: '',
  async load() {
    const tbody = document.getElementById('company-table-body');
    const form = document.getElementById('company-form-container');
    if (!tbody) return;
    if (form) form.style.display = 'none';
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#64748b;">Cargando...</td></tr>';

    try {
      const res = await window.sunatAPI.company.getAll();
      if (!res.success || !res.data?.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No hay empresas.</td></tr>'; return; }
      tbody.innerHTML = res.data.map(c => `
        <tr>
          <td>${c.id}</td>
          <td style="display:flex;align-items:center;gap:8px;">${c.logo_path ? `<img src="${c.logo_path}" style="width:24px;height:24px;border-radius:4px;object-fit:cover;">` : ''}${c.name}</td>
          <td>${c.ruc}</td>
          <td><span class="badge ${c.is_active===1?'valid':'error'}">${c.is_active===1?'Activa':'Inactiva'}</span></td>
          <td><button class="btn-secondary" style="margin-right:4px;" onclick="alert('Edición en v1.1')">✏️</button><button class="btn-primary" onclick="companyMaintenance.toggle(${c.id}, ${c.is_active===1?0:1})">${c.is_active===1?'⏸️':'▶️'}</button></td>
        </tr>
      `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444">Error: ${err.message}</td></tr>`; }
  },
  async toggle(id, status) {
    try { await window.sunatAPI.company.toggleActive({ id, status }); this.load(); window.companySwitcher?.refresh(); } catch (e) { alert('Error: ' + e.message); }
  }
};

// Inicialización segura de formularios
document.addEventListener('DOMContentLoaded', () => {
  const btnNew = document.getElementById('btn-new-company');
  const btnSave = document.getElementById('btn-save-company');
  const btnCancel = document.getElementById('btn-cancel-company');
  const btnLogo = document.getElementById('btn-select-logo');
  const logoPreview = document.getElementById('logo-preview');
  const form = document.getElementById('company-form-container');

  btnNew?.addEventListener('click', () => {
    form.style.display = 'block';
    ['cf-id','cf-name','cf-ruc','cf-address','cf-phone','cf-email','cf-web'].forEach(id => document.getElementById(id).value = '');
    companyMaintenance.logoData = '';
    logoPreview.src = '';
    logoPreview.style.display = 'none';
  });

  btnLogo?.addEventListener('click', async () => {
    const res = await window.sunatAPI.dialog.selectImage();
    if (res.success) {
      companyMaintenance.logoData = res.data;
      logoPreview.src = res.data;
      logoPreview.style.display = 'block';
    } else if (!res.canceled) alert('❌ ' + res.error);
  });

  btnCancel?.addEventListener('click', () => { form.style.display = 'none'; });

  btnSave?.addEventListener('click', async () => {
    const data = {
      name: document.getElementById('cf-name').value.trim(),
      ruc: document.getElementById('cf-ruc').value.trim(),
      address: document.getElementById('cf-address').value.trim(),
      phone: document.getElementById('cf-phone').value.trim(),
      email: document.getElementById('cf-email').value.trim(),
      web: document.getElementById('cf-web').value.trim(),
      logo: companyMaintenance.logoData
    };
    if (!data.name || !/^\d{11}$/.test(data.ruc)) return alert('Nombre y RUC (11 dígitos) son obligatorios');
    
    try {
      const res = await window.sunatAPI.company.create(data);
      if (!res.success) throw new Error(res.error);
      form.style.display = 'none';
      companyMaintenance.load();
      // 🔁 ACTUALIZACIÓN INMEDIATA DEL DROPDOWN
      if (window.companySwitcher) await window.companySwitcher.refresh();
      alert('✅ Empresa creada y agregada al selector.');
    } catch (err) { alert('❌ ' + err.message); }
  });
});