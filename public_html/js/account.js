/* ============================================================
   ESSENZA — Account Module
   Dashboard do cliente: perfil, endereços, pedidos
   ============================================================ */

const EssenzaAccount = (() => {
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let user = null;
  let addresses = [];
  let orders = [];
  let favorites = [];

  async function api(url, options = {}) {
    return EssenzaAuth.api(url, options);
  }

  /* ── Carregar dados ── */
  async function loadAll() {
    user = EssenzaAuth.getUser();
    if (!user) {
      window.location.href = '/';
      return;
    }

    renderProfile();
    await Promise.all([loadAddresses(), loadOrders(), loadFavorites()]);
  }

  /* ── Perfil ── */
  function renderProfile() {
    if (!user) return;
    const el = (id) => document.getElementById(id);
    if (el('profileName')) el('profileName').textContent = user.name;
    if (el('profileEmail')) el('profileEmail').textContent = user.email;
    if (el('profileCpf')) el('profileCpf').textContent = user.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
    if (el('profilePhone')) el('profilePhone').textContent = user.phone || 'Não informado';
    if (el('profileSince')) el('profileSince').textContent = new Date(user.created_at).toLocaleDateString('pt-BR');

    const avatar = el('profileAvatar');
    if (avatar) {
      const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      avatar.textContent = initials;
    }
  }

  /* ── Endereços ── */
  async function loadAddresses() {
    try {
      addresses = await api('/api/addresses');
      renderAddresses();
    } catch { addresses = []; }
  }

  function renderAddresses() {
    const container = document.getElementById('addressList');
    if (!container) return;

    if (!addresses.length) {
      container.innerHTML = '<p class="empty-state">Nenhum endereço cadastrado.</p>';
      return;
    }

    container.innerHTML = addresses.map(addr => `
      <div class="address-card ${addr.is_default ? 'address-default' : ''}">
        <div class="address-card-header">
          <span class="address-label">${addr.label}${addr.is_default ? ' <span class="badge-default">Principal</span>' : ''}</span>
          <div class="address-actions">
            <button type="button" onclick="EssenzaAccount.editAddress('${addr.id}')" aria-label="Editar">✎</button>
            <button type="button" onclick="EssenzaAccount.deleteAddress('${addr.id}')" aria-label="Excluir">✕</button>
          </div>
        </div>
        <p><strong>${addr.recipient}</strong></p>
        <p>${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}</p>
        <p>${addr.neighborhood} — ${addr.city}/${addr.state}</p>
        <p>CEP: ${addr.zip_code}</p>
      </div>
    `).join('');
  }

  async function saveAddress(formData) {
    const id = formData.id;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/addresses/${id}` : '/api/addresses';
    await api(url, { method, body: JSON.stringify(formData) });
    await loadAddresses();
    closeAddressForm();
  }

  async function deleteAddress(id) {
    if (!confirm('Excluir este endereço?')) return;
    await api(`/api/addresses/${id}`, { method: 'DELETE' });
    await loadAddresses();
  }

  function editAddress(id) {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;
    openAddressForm(addr);
  }

  function openAddressForm(addr = null) {
    const form = document.getElementById('addressForm');
    if (!form) return;
    form.style.display = '';

    if (addr) {
      form.querySelector('#addrId').value = addr.id;
      form.querySelector('#addrLabel').value = addr.label;
      form.querySelector('#addrRecipient').value = addr.recipient;
      form.querySelector('#addrStreet').value = addr.street;
      form.querySelector('#addrNumber').value = addr.number;
      form.querySelector('#addrComplement').value = addr.complement || '';
      form.querySelector('#addrNeighborhood').value = addr.neighborhood;
      form.querySelector('#addrCity').value = addr.city;
      form.querySelector('#addrState').value = addr.state;
      form.querySelector('#addrZip').value = addr.zip_code;
      form.querySelector('#addrDefault').checked = addr.is_default;
    } else {
      form.reset();
      form.querySelector('#addrId').value = '';
    }
  }

  function closeAddressForm() {
    const form = document.getElementById('addressForm');
    if (form) form.style.display = 'none';
  }

  /* ── Pedidos ── */
  async function loadOrders() {
    try {
      const data = await api('/api/orders');
      orders = data.data || [];
      renderOrders();
    } catch { orders = []; }
  }

  function renderOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;

    if (!orders.length) {
      container.innerHTML = '<p class="empty-state">Você ainda não tem pedidos.</p>';
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-header" onclick="EssenzaAccount.toggleOrder('${order.id}')">
          <div class="order-card-info">
            <strong>Pedido #${order.order_number}</strong>
            <span class="order-date">${order.formatted_date}</span>
          </div>
          <div class="order-card-meta">
            <span class="order-total">${money.format(parseFloat(order.total))}</span>
            <span class="order-payment">${order.payment_label}</span>
            <span class="order-status status-${order.status}">${order.status_label}</span>
          </div>
          <span class="order-chevron">▾</span>
        </div>
        <div class="order-card-detail" id="orderDetail-${order.id}"></div>
      </div>
    `).join('');
  }

  async function toggleOrder(orderId) {
    const detail = document.getElementById(`orderDetail-${orderId}`);
    if (!detail) return;

    if (detail.classList.contains('open')) {
      detail.classList.remove('open');
      return;
    }

    // Carregar detalhes
    try {
      const order = await api(`/api/orders/${orderId}`);
      detail.innerHTML = renderOrderDetail(order);
      detail.classList.add('open');
    } catch (err) {
      detail.innerHTML = `<p class="empty-state">Erro ao carregar detalhes</p>`;
      detail.classList.add('open');
    }
  }

  function renderOrderDetail(order) {
    const itemsHtml = (order.items || []).map(item => `
      <div class="order-item">
        <div class="order-item-img" style="background-image:url('${item.image || ''}')"></div>
        <div class="order-item-info">
          <strong>${item.product_name}</strong>
          ${item.product_sku ? `<span class="order-item-sku">SKU: ${item.product_sku}</span>` : ''}
          <span>${item.quantity}× ${money.format(parseFloat(item.unit_price))}</span>
        </div>
        <strong class="order-item-total">${money.format(parseFloat(item.total_price))}</strong>
      </div>
    `).join('');

    const timelineHtml = renderTimeline(order.status_history || [], order.shipping_estimate);

    return `
      <div class="order-detail-grid">
        <div class="order-detail-items">
          <h4>Produtos</h4>
          ${itemsHtml}
          <div class="order-detail-totals">
            <div><span>Subtotal</span><strong>${money.format(parseFloat(order.subtotal))}</strong></div>
            <div><span>Frete</span><strong>${parseFloat(order.shipping_cost) === 0 ? 'Grátis 🎉' : money.format(parseFloat(order.shipping_cost))}</strong></div>
            ${parseFloat(order.discount) > 0 ? `<div><span>Desconto</span><strong>-${money.format(parseFloat(order.discount))}</strong></div>` : ''}
            <div class="grand-total"><span>Total</span><strong>${money.format(parseFloat(order.total))}</strong></div>
          </div>
        </div>
        <div class="order-detail-tracking">
          <h4>Rastreamento</h4>
          ${timelineHtml}
          <div class="order-detail-address">
            <h4>Endereço de entrega</h4>
            <p>${order.shipping_name}</p>
            <p>${order.shipping_street}, ${order.shipping_number}${order.shipping_complement ? ' - ' + order.shipping_complement : ''}</p>
            <p>${order.shipping_neighborhood} — ${order.shipping_city}/${order.shipping_state}</p>
            <p>CEP: ${order.shipping_zip}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderTimeline(history, estimate) {
    const allStatuses = [
      { key: 'pending_payment', label: 'Pedido Recebido', icon: '📋' },
      { key: 'paid', label: 'Pagamento Aprovado', icon: '✅' },
      { key: 'processing', label: 'Em Separação', icon: '📦' },
      { key: 'shipped', label: 'Enviado', icon: '🚚' },
      { key: 'out_for_delivery', label: 'Saiu para Entrega', icon: '🏍️' },
      { key: 'delivered', label: 'Entregue', icon: '✨' },
    ];

    // Verificar cancelamento
    const cancelled = history.find(h => h.status === 'cancelled');
    const completedStatuses = history.map(h => h.status);

    let html = '<div class="timeline">';

    allStatuses.forEach((s, i) => {
      const historyEntry = history.find(h => h.status === s.key);
      const isCompleted = !!historyEntry;
      const isCurrent = isCompleted && !completedStatuses.includes(allStatuses[i + 1]?.key);

      html += `
        <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
          <div class="timeline-dot">${isCompleted ? s.icon : '○'}</div>
          <div class="timeline-content">
            <strong>${s.label}</strong>
            ${historyEntry ? `<span>${historyEntry.date} às ${historyEntry.time}</span>` : '<span>Pendente</span>'}
          </div>
        </div>
      `;
    });

    if (cancelled) {
      html += `
        <div class="timeline-step cancelled">
          <div class="timeline-dot">❌</div>
          <div class="timeline-content">
            <strong>Cancelado</strong>
            <span>${cancelled.date} às ${cancelled.time}</span>
            ${cancelled.notes ? `<small>${cancelled.notes}</small>` : ''}
          </div>
        </div>
      `;
    }

    html += '</div>';

    if (estimate) {
      html += `<div class="delivery-estimate"><strong>Previsão de entrega:</strong> ${new Date(estimate).toLocaleDateString('pt-BR')}</div>`;
    }

    return html;
  }

  /* ── Favoritos ── */
  async function loadFavorites() {
    try {
      favorites = await api('/api/favorites');
      renderFavorites();
    } catch { favorites = []; }
  }

  function renderFavorites() {
    const container = document.getElementById('favoritesList');
    if (!container) return;

    if (!favorites.length) {
      container.innerHTML = '<p class="empty-state">Nenhum produto favoritado.</p>';
      return;
    }

    container.innerHTML = favorites.map(p => `
      <div class="favorite-card">
        <div class="favorite-img" style="background-image:url('${p.image || ''}')"></div>
        <div class="favorite-info">
          <span class="favorite-cat">${p.category || ''}</span>
          <strong>${p.name}</strong>
          <span class="favorite-price">${money.format(parseFloat(p.price))}</span>
        </div>
        <button type="button" class="favorite-remove" onclick="EssenzaAccount.removeFavorite('${p.id}')" aria-label="Remover">✕</button>
      </div>
    `).join('');
  }

  async function removeFavorite(productId) {
    try {
      await api(`/api/favorites/${productId}`, { method: 'DELETE' });
      await loadFavorites();
    } catch {}
  }

  /* ── Editar perfil ── */
  function initProfileEdit() {
    const form = document.getElementById('editProfileForm');
    if (!form) return;

    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? '' : 'none';
      if (form.style.display !== 'none') {
        form.querySelector('#editName').value = user.name;
        form.querySelector('#editEmail').value = user.email;
        form.querySelector('#editPhone').value = user.phone || '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;

      try {
        const phone = form.querySelector('#editPhone').value.trim();
        if (phone && !EssenzaAuth.validatePhone(phone)) {
          throw new Error('Telefone inválido');
        }

        await api('/api/users/profile', {
          method: 'PUT',
          body: JSON.stringify({
            name: form.querySelector('#editName').value.trim(),
            email: form.querySelector('#editEmail').value.trim(),
            phone: phone,
          }),
        });
        await EssenzaAuth.checkSession();
        user = EssenzaAuth.getUser();
        renderProfile();
        form.style.display = 'none';
        EssenzaApp?.showToast('Perfil atualizado!', '✓');
      } catch (err) {
        EssenzaApp?.showToast(err.message, '⚠️');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ── Tab navigation ── */
  function initTabs() {
    document.querySelectorAll('.account-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.account-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  }

  /* ── Init ── */
  async function init() {
    initTabs();
    initProfileEdit();

    // Address form
    const addrForm = document.getElementById('addressForm');
    if (addrForm) {
      addrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAddress({
          id: addrForm.querySelector('#addrId').value || null,
          label: addrForm.querySelector('#addrLabel').value,
          recipient: addrForm.querySelector('#addrRecipient').value,
          street: addrForm.querySelector('#addrStreet').value,
          number: addrForm.querySelector('#addrNumber').value,
          complement: addrForm.querySelector('#addrComplement').value,
          neighborhood: addrForm.querySelector('#addrNeighborhood').value,
          city: addrForm.querySelector('#addrCity').value,
          state: addrForm.querySelector('#addrState').value,
          zip_code: addrForm.querySelector('#addrZip').value,
          is_default: addrForm.querySelector('#addrDefault').checked,
        });
      });

      document.getElementById('addAddressBtn')?.addEventListener('click', () => openAddressForm());
      document.getElementById('cancelAddressBtn')?.addEventListener('click', closeAddressForm);
    }

    // Aguardar sessão e carregar dados
    const waitForUser = setInterval(async () => {
      if (EssenzaAuth.getUser()) {
        clearInterval(waitForUser);
        await loadAll();
      }
    }, 200);

    // Timeout
    setTimeout(() => {
      clearInterval(waitForUser);
      if (!EssenzaAuth.isLoggedIn()) window.location.href = '/';
    }, 5000);
  }

  return {
    init,
    toggleOrder,
    editAddress,
    deleteAddress,
    removeFavorite,
    openAddressForm,
    closeAddressForm,
  };
})();

document.addEventListener('DOMContentLoaded', EssenzaAccount.init);
