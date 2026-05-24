const documentList = {
  state: { companyId: null, page: 1, limit: 20, filters: {} },

  async init(companyId) {
    this.state.companyId = companyId;
    this.state.page = 1;
    this.bindFilters();
    await this.load();
  },

  bindFilters() {
    document.getElementById('filter-from').addEventListener('change', () => { this.state.page = 1; this.load(); });
    document.getElementById('filter-to').addEventListener('change', () => { this.state.page = 1; this.load(); });
    document.getElementById('filter-type').addEventListener('change', () => { this.state.page = 1; this.load(); });
    document.getElementById('filter-search').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => { this.state.page = 1; this.load(); }, 400);
    });
    document.getElementById('btn-prev-page').addEventListener('click', () => { if(this.state.page>1) { this.state.page--; this.load(); }});
    document.getElementById('btn-next-page').addEventListener('click', () => { this.state.page++; this.load(); });
  },

  async load() {
    const table = document.getElementById('doc-table-body');
    const loading = document.getElementById('doc-loading');
    table.innerHTML = '';
    loading.style.display = 'block';

    try {
      this.state.filters.from = document.getElementById('filter-from').value;
      this.state.filters.to = document.getElementById('filter-to').value;
      this.state.filters.type = document.getElementById('filter-type').value;
      this.state.filters.search = document.getElementById('filter-search').value.trim();

      const res = await window.sunatAPI.documents.get({
        companyId: this.state.companyId,
        filters: this.state.filters,
        page: this.state.page,
        limit: this.state.limit
      });

      if (!res.success) throw new Error(res.error);
      this.renderTable(res.data);
      this.renderPagination(res);
    } catch (err) {
      table.innerHTML = `<tr><td colspan="7" class="error-row">⚠️ ${err.message}</td></tr>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  renderTable(docs) {
    const tbody = document.getElementById('doc-table-body');
    if (!docs.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b;">No hay documentos en este rango</td></tr>';
      return;
    }
    tbody.innerHTML = docs.map(d => `
      <tr>
        <td>${d.type}</td><td>${d.series}-${d.number}</td>
        <td>${new Date(d.issue_date).toLocaleDateString('es-PE')}</td>
        <td>${d.client_name || '-'}</td><td>${d.client_ruc || '-'}</td>
        <td class="text-right">S/ ${parseFloat(d.total).toFixed(2)}</td>
        <td><span class="badge ${d.status}">${d.status}</span></td>
      </tr>
    `).join('');
  },

  renderPagination(res) {
    document.getElementById('page-info').textContent = `Página ${res.page} de ${res.totalPages || 1}`;
    document.getElementById('btn-prev-page').disabled = res.page <= 1;
    document.getElementById('btn-next-page').disabled = res.page >= res.totalPages;
  }
};