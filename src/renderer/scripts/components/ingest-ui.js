const ingestUI = {
  files: [],
  elements: {},
  initialized: false,

  init() {
    if (this.initialized) return;
    this.elements = {
      dropZone: document.getElementById('drop-zone'),
      fileInput: document.getElementById('file-input'),
      queueContainer: document.getElementById('file-queue'),
      queueList: document.getElementById('queue-list'),
      btnProcess: document.getElementById('btn-start-ingest'),
      btnClear: document.getElementById('btn-clear-queue'),
      companySwitcher: document.getElementById('company-switcher')
    };
    
    if (!Object.values(this.elements).every(Boolean)) {
      return console.warn('⚠️ [IngestUI] Elementos DOM faltantes. Inicialización abortada.');
    }
    this.initialized = true;
    this.bindEvents();
    console.log('✅ [IngestUI] Componente inicializado');
  },

  bindEvents() {
    const { dropZone, fileInput } = this.elements;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }));
    ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.add('drag-over')));
    ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over')));
    
    dropZone.addEventListener('drop', e => this.handleFiles(e.dataTransfer.files));
    dropZone.addEventListener('click', () => fileInput?.click());
    fileInput.addEventListener('change', () => { this.handleFiles(fileInput.files); fileInput.value = ''; });
    
    this.elements.btnClear?.addEventListener('click', () => this.clearQueue());
    this.elements.btnProcess?.addEventListener('click', () => this.processFiles());
  },

  handleFiles(fileList) {
    const allowed = ['.zip', '.xml', '.pdf'];
    Array.from(fileList).forEach(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) return alert(`❌ ${f.name} no permitido`);
      if (f.size > 10 * 1024 * 1024) return alert(`❌ ${f.name} > 10MB`);
      if (this.files.some(x => x.file.name === f.name)) return alert(`⚠️ Duplicado: ${f.name}`);
      this.files.push({ file: f, status: 'pending' });
    });
    this.renderQueue();
  },

  renderQueue() {
    const { queueContainer, queueList, btnProcess } = this.elements;
    queueContainer.style.display = this.files.length ? 'block' : 'none';
    btnProcess.disabled = this.files.length === 0;
    
    queueList.innerHTML = this.files.map(f => `
      <div class="queue-item ${f.status}">
        <span>📄 ${f.file.name}</span>
        <span class="status-badge status-${f.status}">
          ${f.status === 'pending' ? '⏳ Pendiente' : f.status === 'success' ? '✅ OK' : '❌ Error'}
        </span>
      </div>
    `).join('');
  },

  clearQueue() {
    this.files = [];
    this.renderQueue();
    console.log('🧹 [IngestUI] Cola limpiada');
  },

  async processFiles() {
    const btn = this.elements.btnProcess;
    btn.disabled = true;
    btn.textContent = '⏳ Validando...';

    // 1. Validar empresa seleccionada
    const companyId = parseInt(this.elements.companySwitcher?.value, 10);
    if (!companyId || isNaN(companyId)) {
      alert('⚠️ Selecciona una empresa válida en el menú superior antes de procesar.');
      btn.disabled = false;
      btn.textContent = '⚡ Procesar Archivos';
      return;
    }

    try {
      btn.textContent = '⏳ Leyendo archivos...';
      // 2. Leer archivos como ArrayBuffer
      for (const f of this.files) f.data = await f.file.arrayBuffer();

      // 3. Enviar al Main Process
      const payload = {
        companyId,
        files: this.files.map(f => ({ name: f.file.name, data: f.data }))
      };

      btn.textContent = '⏳ Procesando...';
      const response = await window.sunatAPI.ingest.process(payload);

      // 4. 🔑 MANEJO SEGURO DE RESPUESTA (Evita crash en .forEach)
      if (!response || !response.success) {
        throw new Error(response?.error || 'Error desconocido en el proceso principal');
      }

      console.log('📦 RESULTADO DEL PROCESO:', response);

      // Actualizar estados en la UI
      response.results.forEach((r, i) => {
        if (this.files[i]) {
          this.files[i].status = (r.status === 'success' || r.status === 'duplicate') ? 'success' : 'error';
        }
      });
      this.renderQueue();

      // Resumen
      const ok = response.results.filter(r => r.status === 'success').length;
      const dup = response.results.filter(r => r.status === 'duplicate').length;
      const err = response.results.filter(r => r.status === 'error').length;
      alert(`✅ Procesamiento finalizado.\n✅ ${ok} guardados\n⚠️ ${dup} duplicados\n❌ ${err} errores\n\nRevisa la Consola (F12) para ver detalles.`);

      // Refrescar tabla de documentos automáticamente
      if (typeof documentList !== 'undefined') {
        documentList.init(companyId);
      }

    } catch (err) {
      console.error('❌ Error crítico:', err);
      alert('❌ ' + err.message);
      this.files.forEach(f => f.status = 'error');
      this.renderQueue();
    } finally {
      btn.disabled = false;
      btn.textContent = '⚡ Procesar Archivos';
    }
  }
};

window.ingestUI = ingestUI;