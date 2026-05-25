const documentList = {
  state: { companyId: null, page: 1, limit: 20, filters: {} },

  async init(companyId) {
    if (!companyId) return console.warn('⚠️ [DocumentList] companyId null');
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

      if (!res.success) throw new Error(res.error);

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
            <td><button class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="documentList.openDetail(${d.id})">👁️ Ver</button></td>
          </tr>
        `).join('');
      }

      if (pageInfo) pageInfo.textContent = `Pág ${res.page} de ${res.totalPages || 1}`;
      if (btnPrev) btnPrev.disabled = res.page <= 1;
      if (btnNext) btnNext.disabled = res.page >= res.totalPages;

    } catch (err) {
      console.error('❌ [DocumentList]', err);
      tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;text-align:center;padding:20px;">⚠️ ${err.message}</td></tr>`;
    } finally {
      if (loading) loading.style.display = 'none';
    }
  },

  async openDetail(id) {
    try {
      const modal = document.getElementById('doc-detail-modal');
      modal.style.display = 'flex';
      document.getElementById('modal-title').textContent = 'Cargando...';
      
      const res = await window.sunatAPI.documents.getById(id);
      if (!res.success || !res.data) throw new Error('Documento no encontrado');
      
      const d = res.data;
      document.getElementById('modal-title').textContent = `${d.type || 'Documento'} #${d.series || ''}-${d.number || ''}`;
      document.getElementById('dt-type').textContent = d.type || '-';
      document.getElementById('dt-series-number').textContent = `${d.series || ''}-${d.number || ''}`;
      document.getElementById('dt-issue-date').textContent = d.issue_date ? new Date(d.issue_date).toLocaleDateString('es-PE') : '-';
      document.getElementById('dt-company').textContent = d.company_name || '-';
      document.getElementById('dt-supplier').textContent = d.supplier_name ? `${d.supplier_name} (${d.supplier_ruc || ''})` : (d.supplier_ruc || '-');
      document.getElementById('dt-client').textContent = d.client_name ? `${d.client_name} (${d.client_ruc || ''})` : (d.client_ruc || '-');
      document.getElementById('dt-subtotal').textContent = `S/ ${parseFloat(d.subtotal || 0).toFixed(2)}`;
      document.getElementById('dt-igv').textContent = `S/ ${parseFloat(d.igv || 0).toFixed(2)}`;
      document.getElementById('dt-total').textContent = `S/ ${parseFloat(d.total || 0).toFixed(2)}`;
      document.getElementById('dt-currency').textContent = d.currency || 'PEN';
      document.getElementById('dt-status').textContent = d.status || 'PENDIENTE';
      document.getElementById('dt-notes').value = d.notes || '';

      // Renderizar ítems
      const itemsBody = document.getElementById('dt-items-body');
      if (d.items && d.items.length > 0) {
        let itemsTotal = 0;
        itemsBody.innerHTML = d.items.map(item => {
          itemsTotal += parseFloat(item.total_line || 0);
          return `<tr>
            <td>${item.line_number}</td>
            <td>${item.description || '-'}</td>
            <td>${item.quantity || 0}</td>
            <td>S/ ${parseFloat(item.unit_price || 0).toFixed(2)}</td>
            <td>S/ ${parseFloat(item.total_line || 0).toFixed(2)}</td>
          </tr>`;
        }).join('');
        document.getElementById('dt-items-total').textContent = `S/ ${itemsTotal.toFixed(2)}`;
      } else {
        itemsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">Sin ítems registrados</td></tr>';
        document.getElementById('dt-items-total').textContent = 'S/ 0.00';
      }
    } catch (err) {
      console.error('❌ [Detail]', err);
      alert('Error al cargar detalle: ' + err.message);
      document.getElementById('doc-detail-modal').style.display = 'none';
    }
  }
};

window.documentList = documentList;