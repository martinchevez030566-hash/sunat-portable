const setupWizard = {
  currentStep: 1,
  data: {},

  init() {
    this.bindEvents();
    this.showStep(1);
  },

  bindEvents() {
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    bindBtn('btn-next-1', () => this.validateStep1());
    bindBtn('btn-next-2', () => this.validateStep2());
    bindBtn('btn-finish', () => this.submit());
    bindBtn('btn-prev-2', () => this.showStep(1));
    bindBtn('btn-prev-3', () => this.showStep(2));

    const rucInput = document.getElementById('w-ruc');
    if (rucInput) {
      rucInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
        document.getElementById('err-ruc').textContent = '';
        e.target.classList.remove('invalid');
      });
    }
  },

  clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('input.invalid').forEach(el => el.classList.remove('invalid'));
  },

  showStep(step) {
    this.clearErrors();
    document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
    document.getElementById(`step-${step}`).style.display = 'block';
    document.querySelectorAll('.step-indicator').forEach((el, i) => {
      el.classList.toggle('active', i + 1 <= step);
      el.classList.toggle('completed', i + 1 < step);
    });
    this.currentStep = step;
  },

  validateStep1() {
    this.clearErrors();
    const nameInput = document.getElementById('w-name');
    const rucInput = document.getElementById('w-ruc');
    if (!nameInput || !rucInput) return;

    this.data.name = nameInput.value.trim();
    this.data.ruc = rucInput.value.trim();

    let hasError = false;
    if (!this.data.name) {
      document.getElementById('err-name').textContent = '⚠️ El nombre es obligatorio';
      nameInput.classList.add('invalid');
      nameInput.focus();
      hasError = true;
    } else if (!/^\d{11}$/.test(this.data.ruc)) {
      document.getElementById('err-ruc').textContent = '⚠️ El RUC debe tener exactamente 11 dígitos';
      rucInput.classList.add('invalid');
      rucInput.focus();
      rucInput.select();
      hasError = true;
    }

    if (!hasError) this.showStep(2);
  },

  validateStep2() {
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    this.data.address = getVal('w-address');
    this.data.phone = getVal('w-phone');
    this.data.email = getVal('w-email');
    this.data.web = getVal('w-web');

    const preview = document.getElementById('preview-data');
    if (preview) {
      preview.textContent = `Empresa: ${this.data.name}\nRUC: ${this.data.ruc}\nDirección: ${this.data.address || '-'}\nTeléfono: ${this.data.phone || '-'}\nEmail: ${this.data.email || '-'}\nWeb: ${this.data.web || '-'}`;
    }

    this.showStep(3);
  },

  async submit() {
    const btn = document.getElementById('btn-finish');
    const status = document.getElementById('wizard-status');
    if (!btn || !status) return;

    btn.disabled = true;
    btn.textContent = 'Procesando...';

    try {
      let companyId = null;

      // 1. Intentar crear. Si ya existe, recuperar el ID existente sin fallar.
      const createRes = await window.sunatAPI.company.create(this.data);
      if (createRes.success) {
        companyId = createRes.id;
      } else if (createRes.error.includes('Ya existe una empresa')) {
        console.log('ℹ️ [Wizard] RUC ya registrado. Buscando ID existente...');
        const allRes = await window.sunatAPI.company.getAll();
        const existing = allRes.data?.find(c => c.ruc === this.data.ruc);
        if (existing) companyId = existing.id;
        else throw new Error('No se pudo recuperar la empresa existente.');
      } else {
        throw new Error(createRes.error);
      }

      // 2. SIEMPRE actualizar settings (aquí estaba el bug)
      await window.sunatAPI.settings.update({ key: 'setup_completed', value: '1' });
      await window.sunatAPI.settings.update({ key: 'active_company_id', value: String(companyId) });

      status.textContent = '✅ Configuración guardada. Cargando sistema...';
      status.style.color = '#10b981';
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`;
      status.style.color = '#ef4444';
    } finally {
      btn.disabled = false;
      btn.textContent = '✅ Finalizar Configuración';
    }
  }
};