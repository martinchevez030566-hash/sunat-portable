const companyMaintenance = {
  logoData: '',
  isEditing: false,

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
          <td><button class="btn-secondary" style="margin-right:4px;" onclick="companyMaintenance.edit(${c.id})">✏️</button><button class="btn-primary" onclick="companyMaintenance.toggle(${c.id}, ${c.is_active===1?0:1})">${c.is_active===1?'⏸️':'▶️'}</button></td>
        </tr>
      `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444">Error: ${err.message}</td></tr>`; }
  },

  async toggle(id, status) {
    try { await window.sunatAPI.company.toggleActive({ id, status }); this.load(); window.companySwitcher?.refresh(); } catch (e) { alert('Error: ' + e.message); }
  },

  async edit(id) {
    if (!window.sunatAPI?.company?.getById) return alert('⚠️ API no cargada. Recarga la app (Ctrl+R).');
    
    try {
      const res = await window.sunatAPI.company.getById(id);
      if (!res.success || !res.data) throw new Error('Empresa no encontrada');
      const c = res.data;
      
      // Helper seguro para evitar "cannot set properties of null"
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
      
      setVal('cf-id', c.id);
      setVal('cf-name', c.name);
      setVal('cf-ruc', c.ruc);
      setVal('cf-address', c.address);
      setVal('cf-phone', c.phone);
      setVal('cf-email', c.email);
      setVal('cf-web', c.web);
      document.getElementById('company-form-title').textContent = `Editar: ${c.name}`;
      
      if (c.logo_path) {
        this.logoData = c.logo_path;
        document.getElementById('logo-preview').src = c.logo_path;
        document.getElementById('logo-preview').style.display = 'block';
      } else {
        this.logoData = '';
        document.getElementById('logo-preview').style.display = 'none';
      }
      
      this.isEditing = true;
      this.showForm();
    } catch (err) { alert('❌ ' + err.message); }
  },

  showForm() {
    const form = document.getElementById('company-form-container');
    if (!form) return;
    form.style.display = 'block';
    form.style.pointerEvents = 'auto';
    form.style.opacity = '1';
    void form.offsetHeight; // Force reflow
    form.querySelectorAll('input').forEach(el => { el.disabled = false; el.removeAttribute('readonly'); });
    setTimeout(() => document.getElementById('cf-name')?.focus(), 50);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const btnNew = document.getElementById('btn-new-company');
  const btnSave = document.getElementById('btn-save-company');
  const btnCancel = document.getElementById('btn-cancel-company');
  const btnLogo = document.getElementById('btn-select-logo');
  const logoPreview = document.getElementById('logo-preview');
  const form = document.getElementById('company-form-container');

  btnNew?.addEventListener('click', () => {
    companyMaintenance.isEditing = false;
    document.getElementById('cf-id').value = '';
    ['cf-name','cf-ruc','cf-address','cf-phone','cf-email','cf-web'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('company-form-title').textContent = 'Nueva Empresa';
    companyMaintenance.logoData = '';
    logoPreview.src = '';
    logoPreview.style.display = 'none';
    companyMaintenance.showForm();
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
      id: document.getElementById('cf-id').value ? parseInt(document.getElementById('cf-id').value) : null,
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
      let res;
      if (companyMaintenance.isEditing) res = await window.sunatAPI.company.update(data);
      else res = await window.sunatAPI.company.create(data);
      
      if (!res.success) throw new Error(res.error);
      form.style.display = 'none';
      companyMaintenance.load();
      window.companySwitcher?.refresh();
      alert(companyMaintenance.isEditing ? '✅ Empresa actualizada.' : '✅ Empresa creada.');
    } catch (err) { alert('❌ ' + err.message); }
  });
});