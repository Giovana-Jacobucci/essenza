/* ============================================================
   ESSENZA — Admin Module
   Dashboard, gestão de pedidos, produtos e clientes
   ============================================================ */

const EssenzaAdmin = (() => {
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let currentSection = 'dashboard';

  async function api(url, options = {}) {
    return EssenzaAuth.api(url, options);
  }

  /* ── Dashboard ── */
  async function loadDashboard() {
    try {
      const data = await api('/api/admin/dashboard');
      renderDashboard(data);
    } catch (err) {
      console.error('Dashboard error:', err);
    }
  }

  function renderDashboard(data) {
    const el = (id) => document.getElementById(id);
    if (el('statRevenue')) el('statRevenue').textContent = money.format(data.total_revenue);
    if (el('statOrders')) el('statOrders').textContent = data.total_orders;
    if (el('statCustomers')) el('statCustomers').textContent = data.total_customers;
    if (el('statProducts')) el('statProducts').textContent = data.total_products;
    if (el('statMonthlyRevenue')) el('statMonthlyRevenue').textContent = money.format(data.monthly_revenue);
    if (el('statMonthlyOrders')) el('statMonthlyOrders').textContent = data.monthly_orders;

    // Pedidos recentes
    const recentContainer = el('recentOrders');
    if (recentContainer && data.recent_orders) {
      recentContainer.innerHTML = data.recent_orders.map(o => `
        <tr onclick="EssenzaAdmin.viewOrder('${o.id}')">
          <td>#${o.order_number}</td>
          <td>${o.customer_name}</td>
          <td>${money.format(parseFloat(o.total))}</td>
          <td><span class="status-badge status-${o.status}">${o.status_label}</span></td>
          <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
        </tr>
      `).join('');
    }

    // Estoque baixo
    const lowStockContainer = el('lowStockList');
    if (lowStockContainer && data.low_stock) {
      lowStockContainer.innerHTML = data.low_stock.map(p => `
        <div class="low-stock-item">
          <span>${p.name}</span>
          <span class="low-stock-qty">${p.stock} un.</span>
        </div>
      `).join('') || '<p class="empty-state">Nenhum produto com estoque baixo</p>';
    }

    // Chart (barras simples CSS)
    const chartContainer = el('monthlyChart');
    if (chartContainer && data.monthly_chart?.length) {
      const maxRevenue = Math.max(...data.monthly_chart.map(m => parseFloat(m.revenue)));
      chartContainer.innerHTML = data.monthly_chart.map(m => {
        const pct = maxRevenue > 0 ? (parseFloat(m.revenue) / maxRevenue * 100) : 0;
        const monthLabel = new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short' });
        return `
          <div class="chart-bar">
            <div class="chart-bar-fill" style="height:${pct}%"></div>
            <span class="chart-bar-label">${monthLabel}</span>
            <span class="chart-bar-value">${money.format(parseFloat(m.revenue))}</span>
          </div>
        `;
      }).join('');
    }
  }

  /* ── Pedidos ── */
  async function loadOrders(page = 1) {
    const status = document.getElementById('filterStatus')?.value || '';
    const search = document.getElementById('filterSearch')?.value || '';
    const dateFrom = document.getElementById('filterDateFrom')?.value || '';
    const dateTo = document.getElementById('filterDateTo')?.value || '';

    const params = new URLSearchParams({ page, per_page: 20 });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    try {
      const data = await api(`/api/admin/orders?${params}`);
      renderOrders(data.data, data.pagination);
    } catch (err) {
      console.error('Orders error:', err);
    }
  }

  function renderOrders(orders, pagination) {
    const tbody = document.getElementById('ordersTable');
    if (!tbody) return;

    tbody.innerHTML = orders.map(o => `
      <tr onclick="EssenzaAdmin.viewOrder('${o.id}')">
        <td>#${o.order_number}</td>
        <td>${o.formatted_date}</td>
        <td>
          <div>${o.customer_name}</div>
          <small>${o.customer_email}</small>
        </td>
        <td>${money.format(parseFloat(o.total))}</td>
        <td>${o.payment_label}</td>
        <td><span class="status-badge status-${o.status}">${o.status_label}</span></td>
      </tr>
    `).join('');

    renderPagination('ordersPagination', pagination, loadOrders);
  }

  async function viewOrder(orderId) {
    try {
      const order = await api(`/api/admin/orders/${orderId}`);
      showOrderModal(order);
    } catch (err) {
      console.error('Order detail error:', err);
    }
  }

  function showOrderModal(order) {
    const modal = document.getElementById('orderModal');
    if (!modal) return;

    const itemsHtml = (order.items || []).map(i => `
      <tr>
        <td>${i.product_sku || '-'}</td>
        <td>${i.product_name}</td>
        <td>${i.quantity}</td>
        <td>${money.format(parseFloat(i.unit_price))}</td>
        <td>${money.format(parseFloat(i.total_price))}</td>
      </tr>
    `).join('');

    const timelineHtml = (order.status_history || []).map(h => `
      <div class="admin-timeline-step">
        <div class="admin-timeline-dot"></div>
        <div>
          <strong>${h.status_label}</strong>
          <span>${h.date} às ${h.time}</span>
          ${h.changed_by_name ? `<small>por ${h.changed_by_name}</small>` : ''}
          ${h.notes ? `<small>${h.notes}</small>` : ''}
        </div>
      </div>
    `).join('');

    modal.querySelector('.modal-body').innerHTML = `
      <div class="order-modal-grid">
        <div class="order-modal-section">
          <h3>Pedido #${order.order_number}</h3>
          <p>Data: ${order.formatted_date}</p>
          <p>Status: <span class="status-badge status-${order.status}">${order.status_label}</span></p>

          <h4>Cliente</h4>
          <p>${order.customer_name}</p>
          <p>CPF: ${order.customer_cpf}</p>
          <p>Email: ${order.customer_email}</p>
          <p>Tel: ${order.customer_phone || '-'}</p>

          <h4>Endereço de Entrega</h4>
          <p>${order.shipping_name}</p>
          <p>${order.shipping_street}, ${order.shipping_number}${order.shipping_complement ? ' - ' + order.shipping_complement : ''}</p>
          <p>${order.shipping_neighborhood} — ${order.shipping_city}/${order.shipping_state}</p>
          <p>CEP: ${order.shipping_zip}</p>
        </div>

        <div class="order-modal-section">
          <h4>Produtos</h4>
          <table class="admin-table compact">
            <thead><tr><th>SKU</th><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="order-detail-totals" style="margin-top:16px">
            <div><span>Subtotal</span><strong>${money.format(parseFloat(order.subtotal))}</strong></div>
            <div><span>Frete</span><strong>${parseFloat(order.shipping_cost) === 0 ? 'Grátis' : money.format(parseFloat(order.shipping_cost))}</strong></div>
            <div class="grand-total"><span>Total</span><strong>${money.format(parseFloat(order.total))}</strong></div>
          </div>

          <h4>Alterar Status</h4>
          <div class="status-change-row">
            <select id="newOrderStatus">
              <option value="pending_payment">Aguardando Pagamento</option>
              <option value="paid">Pago</option>
              <option value="processing">Em Separação</option>
              <option value="shipped">Enviado</option>
              <option value="out_for_delivery">Saiu para Entrega</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <input id="statusNotes" placeholder="Observação (opcional)" />
            <button class="primary-button" onclick="EssenzaAdmin.updateOrderStatus('${order.id}')">Atualizar</button>
          </div>

          <h4>Histórico</h4>
          <div class="admin-timeline">${timelineHtml}</div>
        </div>
      </div>
    `;

    modal.querySelector('#newOrderStatus').value = order.status;
    modal.classList.add('open');
  }

  async function updateOrderStatus(orderId) {
    const status = document.getElementById('newOrderStatus')?.value;
    const notes = document.getElementById('statusNotes')?.value || '';

    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes }),
      });

      EssenzaApp?.showToast('Status atualizado!', '✓');
      closeModal('orderModal');
      loadOrders();
      loadDashboard();
    } catch (err) {
      EssenzaApp?.showToast(err.message, '⚠️');
    }
  }

  /* ── Produtos (admin) ── */
  async function loadProducts(page = 1) {
    const search = document.getElementById('productSearch')?.value || '';
    const params = new URLSearchParams({ page, per_page: 20 });
    if (search) params.set('search', search);

    try {
      const data = await api(`/api/products?${params}`);
      renderAdminProducts(data.data, data.pagination);
    } catch {}
  }

  function renderAdminProducts(products, pagination) {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.sku || '-'}</td>
        <td>${p.name}</td>
        <td>${p.category || '-'}</td>
        <td>${money.format(parseFloat(p.price))}</td>
        <td class="${parseInt(p.stock) <= 5 ? 'low-stock' : ''}">${p.stock}</td>
        <td>
          <button type="button" onclick="EssenzaAdmin.editProduct('${p.id}')" class="btn-sm">Editar</button>
          <button type="button" onclick="EssenzaAdmin.deleteProduct('${p.id}')" class="btn-sm btn-danger">Excluir</button>
        </td>
      </tr>
    `).join('');

    renderPagination('productsPagination', pagination, loadProducts);
  }

  async function editProduct(productId) {
    try {
      const product = await api(`/api/products/${productId}`);
      openProductForm(product);
    } catch {}
  }

  function openProductForm(product = null) {
    const form = document.getElementById('adminProductForm');
    if (!form) return;
    form.style.display = '';

    if (product) {
      form.querySelector('#pId').value = product.id;
      form.querySelector('#pSku').value = product.sku || '';
      form.querySelector('#pName').value = product.name;
      form.querySelector('#pPrice').value = product.price;
      form.querySelector('#pWeight').value = product.weight;
      form.querySelector('#pStock').value = product.stock;
      form.querySelector('#pImage').value = product.image || '';
      form.querySelector('#pDescription').value = product.description;
      form.querySelector('#pNew').checked = product.is_new == 1;
      form.querySelector('#pBestSeller').checked = product.is_best_seller == 1;
    } else {
      form.reset();
      form.querySelector('#pId').value = '';
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    const form = document.getElementById('adminProductForm');
    const id = form.querySelector('#pId').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';

    const data = {
      sku: form.querySelector('#pSku').value,
      name: form.querySelector('#pName').value,
      price: parseFloat(form.querySelector('#pPrice').value),
      weight: parseInt(form.querySelector('#pWeight').value) || 0,
      stock: parseInt(form.querySelector('#pStock').value) || 0,
      image: form.querySelector('#pImage').value,
      description: form.querySelector('#pDescription').value,
      is_new: form.querySelector('#pNew').checked,
      is_best_seller: form.querySelector('#pBestSeller').checked,
    };

    try {
      await api(url, { method, body: JSON.stringify(data) });
      EssenzaApp?.showToast(id ? 'Produto atualizado!' : 'Produto criado!', '✓');
      form.style.display = 'none';
      loadProducts();
    } catch (err) {
      EssenzaApp?.showToast(err.message, '⚠️');
    }
  }

  async function deleteProduct(productId) {
    if (!confirm('Desativar este produto?')) return;
    try {
      await api(`/api/products/${productId}`, { method: 'DELETE' });
      EssenzaApp?.showToast('Produto desativado', '🗑️');
      loadProducts();
    } catch {}
  }

  /* ── Clientes ── */
  async function loadCustomers(page = 1) {
    const search = document.getElementById('customerSearch')?.value || '';
    const params = new URLSearchParams({ page, per_page: 20 });
    if (search) params.set('search', search);

    try {
      const data = await api(`/api/admin/customers?${params}`);
      renderCustomers(data.data, data.pagination);
    } catch {}
  }

  function renderCustomers(customers, pagination) {
    const tbody = document.getElementById('customersTable');
    if (!tbody) return;

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.cpf}</td>
        <td>${c.phone || '-'}</td>
        <td>${new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
      </tr>
    `).join('');

    renderPagination('customersPagination', pagination, loadCustomers);
  }

  /* ── Paginação ── */
  function renderPagination(containerId, pag, loadFn) {
    const container = document.getElementById(containerId);
    if (!container || !pag) return;

    if (pag.total_pages <= 1) { container.innerHTML = ''; return; }

    let html = '<div class="pagination">';
    for (let i = 1; i <= pag.total_pages; i++) {
      html += `<button class="${i === pag.page ? 'active' : ''}" onclick="(${loadFn.name})(${i})">${i}</button>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  /* ── Modal ── */
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  /* ── Sidebar Navigation ── */
  function initNav() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        const section = document.getElementById(item.dataset.section);
        if (section) section.classList.add('active');

        // Carregar dados da seção
        const sectionName = item.dataset.section;
        if (sectionName === 'adminDashboard') loadDashboard();
        else if (sectionName === 'adminOrders') loadOrders();
        else if (sectionName === 'adminProducts') loadProducts();
        else if (sectionName === 'adminCustomers') loadCustomers();
      });
    });
  }

  /* ── Init ── */
  async function init() {
    initNav();

    // Verificar se é admin
    const waitForUser = setInterval(async () => {
      const user = EssenzaAuth.getUser();
      if (user) {
        clearInterval(waitForUser);
        if (user.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        loadDashboard();
      }
    }, 200);

    setTimeout(() => {
      clearInterval(waitForUser);
      if (!EssenzaAuth.isAdmin()) window.location.href = '/';
    }, 5000);

    // Filtros de pedidos
    document.getElementById('applyOrderFilters')?.addEventListener('click', () => loadOrders());

    // Formulário de produto
    document.getElementById('adminProductForm')?.addEventListener('submit', saveProduct);
    document.getElementById('addProductBtn')?.addEventListener('click', () => openProductForm());
    document.getElementById('cancelProductBtn')?.addEventListener('click', () => {
      document.getElementById('adminProductForm').style.display = 'none';
    });

    // Busca de produtos
    document.getElementById('productSearch')?.addEventListener('input', () => loadProducts());
    document.getElementById('customerSearch')?.addEventListener('input', () => loadCustomers());

    // Modal fechar
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
  }

  return {
    init,
    viewOrder,
    updateOrderStatus,
    editProduct,
    deleteProduct,
    openProductForm,
  };
})();

document.addEventListener('DOMContentLoaded', EssenzaAdmin.init);
