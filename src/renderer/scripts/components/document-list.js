const documentList = {
  state: { companyId: null, page: 1, limit: 20, filters: {} },

  async init(companyId) {
    if (!companyId) {
      console.warn('⚠️ [DocumentList] companyId es null. Abortando carga.');
      return;
    }
    this.state.companyId = companyId;
    this.state.page = 1;
    this.bindFilters();
    await this.load();
  },

  bindFilters() {
    const els = {
      from: document.getElementById('filter-from'),
      to: document.getElementById('filter-to'),
      type: document.getElementById('filter-type'),
      search: document.getElementById('filter-search'),
      prev: document.getElementById('btn-prev-page'),
      next: document.getElementById('btn-next-page')
    };

    if (els.from) els.onchange = () => { this.state.page = 1; this.load(); };
    if (els.to) els.onchange = () => { this.state.page = 1; this.load(); };
    if (els.type) els.onchange = () => { this.state.page = 1; this.load(); };
    if (els.search) els.oninput = () => {
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => { this.state.page = 1; this.load(); }, 500);
    };
    if (els.prev) els.onclick = () => { if(this.state.page > 1) { this.state.page--; this.load(); } };
    if (els.next) els.onclick = () => { this.state.page++; this.load(); };
  },

  async load() {
    const tbody = document.getElementById('doc-table-body');
    const loading = document.getElementById('doc-loading');
    const pageInfo = document.getElementById('page-info');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    if (!tbody) return;
    tbody.innerHTML = '';
    if (loading) loading.style.display = 'block';

    try {
      this.state.filters.from = document.getElementById('filter-from')?.value || '';
      this.state.filters.to = document.getElementById('filter-to')?.value || '';
      this.state.filters.type = document.getElementById('filter-type')?.value || '';
      this.state.filters.search = document.getElementById('filter-search')?.value.trim() || '';

      const res = await window.sunatAPI.documents.get({
        companyId: this.state.companyId,
        filters: this.state.filters,
        page: this.state.page,
        limit: this.state.limit
      });

      if (!res.success) throw new Error(res.error || 'Error desconocido del servidor');

      if (!res.data || res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">📄 No hay documentos en este rango</td></tr>`;
      } else {
        tbody.innerHTML = res.data.map(d => `
          <tr>
            <td>${d.type || '-'}</td>
            <td>${d.series || ''}-${d.number || ''}</td>
            <td>${d.issue_date ? new Date(d.issue_date).toLocaleDateString('es-PE') : '-'}</td>
            <td>${d.client_name || '-'}</td>
            <td>${d.client_ruc || '-'}</td>
            <td style="text-align:right;">S/ ${parseFloat(d.total || 0).toFixed(2)}</td>
            <td><span class="badge ${d.status === 'valid' ? 'valid' : ''}">${d.status || 'PENDIENTE'}</span></td>
          </tr>
        `).join('');
      }

      if (pageInfo) pageInfo.textContent = `Pág ${res.page} de ${res.totalPages || 1}`;
      if (btnPrev) btnPrev.disabled = res.page <= 1;
      if (btnNext) btnNext.disabled = res.page >= res.totalPages;

    } catch (err) {
      // 🔑 LOG EXPLÍCITO PARA DIAGNÓSTICO
      console.error('❌ [DocumentList] FALLO DETALLADO:', err.message || err);
      tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;text-align:center;padding:20px;">⚠️ ${err.message || 'Error al cargar documentos'}</td></tr>`;
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }
};

window.documentList = documentList;