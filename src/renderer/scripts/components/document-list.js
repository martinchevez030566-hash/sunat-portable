const documentList = {
  state: { companyId: null, page: 1, limit: 20, filters: {} },
  
  async init(companyId) {
    this.state.companyId = companyId;
    this.state.page = 1;
    this.bindFilters();
    await this.load();
  },

  bindFilters() {
    const els = ['filter-from','filter-to','filter-type','filter-search','btn-prev-page','btn-next-page'];
    const listeners = {
      'filter-from': () => { this.state.page = 1; this.load(); },
      'filter-to': () => { this.state.page = 1; this.load(); },
      'filter-type': () => { this.state.page = 1; this.load(); },
      'filter-search': (e) => { clearTimeout(this._searchTimer); this._searchTimer = setTimeout(() => { this.state.page = 1; this.load(); }, 500); },
      'btn-prev-page': () => { if(this.state.page>1){ this.state.page--; this.load(); } },
      'btn-next-page': () => { this.state.page++; this.load(); }
    };
    
    els.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.removeEventListener('click', listeners[id]); // Limpiar previos
        el.removeEventListener('change', listeners[id]);
        el.removeEventListener('input', listeners[id]);
        
        const event = id.includes('search') ? 'input' : (id.includes('btn') ? 'click' : 'change');
        el.addEventListener(event, listeners[id]);
      }
    });
  },

  async load() {
    const tbody = document.getElementById('doc-table-body');
    const loading = document.getElementById('doc-loading');
    if (!tbody) return;

    tbody.innerHTML = '';
    loading.style.display = 'block';

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

      if (!res.success) throw new Error(res.error);
      
      tbody.innerHTML = res.data.length ? res.data.map(d => `
        <tr>
          <td>${d.type}</td><td>${d.series}-${d.number}</td>
          <td>${new Date(d.issue_date).toLocaleDateString('es-PE')}</td>
          <td>${d.client_name || '-'}</td><td>${d.client_ruc || '-'}</td>
          <td class="text-right">S/ ${parseFloat(d.total).toFixed(2)}</td>
          <td><span class="badge valid">${d.status}</span></td>
        </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">No hay documentos en este rango</td></tr>`;
        
      document.getElementById('page-info').textContent = `Pág ${res.page} de ${res.totalPages || 1}`;
      document.getElementById('btn-prev-page').disabled = res.page <= 1;
      document.getElementById('btn-next-page').disabled = res.page >= res.totalPages;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;text-align:center;padding:20px;">⚠️ ${err.message}</td></tr>`;
    } finally {
      loading.style.display = 'none';
    }
  }
};