/* ============================================================
   ESSENZA — Cart Module
   Carrinho com mini-cart, persistência e checkout
   ============================================================ */

const EssenzaCart = (() => {
  const CART_KEY = 'essenza_cart_v2';
  const FREESHIP_MIN = 399;
  let items = [];
  let currentShipping = null;
  let miniCartTimeout = null;

  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  /* ── Elementos ── */
  function el(id) { return document.getElementById(id); }

  /* ── Carregar carrinho ── */
  function loadLocal() {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }

  function saveLocal() {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  /* ── API de carrinho ── */
  async function syncWithServer() {
    if (!window.EssenzaAuth?.isLoggedIn()) return;

    try {
      const data = await EssenzaAuth.api('/api/cart');
      items = data.items.map(i => ({
        productId: i.product_id,
        quantity: i.quantity,
        product: {
          id: i.product_id,
          name: i.name,
          price: parseFloat(i.price),
          stock: i.stock,
          image: i.image,
          weight: i.weight,
          category: i.category,
        }
      }));
      renderAll();
    } catch {
      // Fallback para localStorage
      items = loadLocal();
    }
  }

  /* ── Adicionar ao carrinho ── */
  async function addItem(product, qty = 1) {
    const existing = items.find(i => i.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + qty > product.stock) {
      EssenzaApp.showToast('Estoque insuficiente', '⚠️');
      return;
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({ productId: product.id, quantity: qty, product });
    }

    // Sync com servidor se logado
    if (window.EssenzaAuth?.isLoggedIn()) {
      try {
        await EssenzaAuth.api('/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({ product_id: product.id, quantity: qty }),
        });
      } catch {}
    }

    saveLocal();
    currentShipping = null;
    renderAll();
    EssenzaApp.showToast(`<strong>${product.name}</strong> adicionado ao carrinho!`, '✓');
    openDrawer();
    showMiniCart();
  }

  /* ── Alterar quantidade ── */
  async function changeQty(productId, delta) {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    const newQty = Math.max(0, Math.min(item.product.stock, item.quantity + delta));

    if (newQty === 0) {
      items = items.filter(i => i.productId !== productId);
    } else {
      item.quantity = newQty;
    }

    if (window.EssenzaAuth?.isLoggedIn()) {
      try {
        await EssenzaAuth.api('/api/cart/update', {
          method: 'PUT',
          body: JSON.stringify({ product_id: productId, quantity: newQty }),
        });
      } catch {}
    }

    saveLocal();
    currentShipping = null;
    renderAll();
  }

  /* ── Cálculos ── */
  function getSubtotal() {
    return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }

  function getTotalWeight() {
    return items.reduce((sum, i) => sum + (i.product.weight || 0) * i.quantity, 0);
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.quantity, 0);
  }

  /* ── Renderização ── */
  function renderAll() {
    renderBadge();
    renderCartItems();
    renderTotals();
    renderFreeshipBar();
    renderMiniCartItems();
  }

  function renderBadge() {
    const badge = el('cartCount');
    if (badge) {
      const count = getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
  }

  function renderCartItems() {
    const container = el('cartItems');
    if (!container) return;

    container.innerHTML = '';

    if (!items.length) {
      container.innerHTML = '<p class="empty-state">Seu carrinho está vazio.<br><small>Explore nossos produtos e adicione o que desejar.</small></p>';
      return;
    }

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-line';
      row.innerHTML = `
        <div class="cart-line-info">
          <div class="cart-line-image" style="background-image:url('${item.product.image || ''}')"></div>
          <div>
            <h4>${item.product.name}</h4>
            <span>${item.quantity} × ${money.format(item.product.price)}</span>
          </div>
        </div>
        <div class="line-actions">
          <button type="button" aria-label="Diminuir">−</button>
          <strong>${item.quantity}</strong>
          <button type="button" aria-label="Aumentar">+</button>
        </div>
      `;
      const [minus, plus] = row.querySelectorAll('button');
      minus.addEventListener('click', () => changeQty(item.productId, -1));
      plus.addEventListener('click', () => changeQty(item.productId, +1));
      container.appendChild(row);
    });
  }

  function renderTotals() {
    const subtotalEl = el('subtotalValue');
    const shippingEl = el('shippingValue');
    const totalEl = el('totalValue');

    const subtotal = getSubtotal();
    const shipping = currentShipping?.price || 0;
    const total = subtotal + shipping;

    if (subtotalEl) subtotalEl.textContent = money.format(subtotal);
    if (shippingEl) shippingEl.textContent = currentShipping
      ? (currentShipping.price === 0 ? '🎉 Grátis' : money.format(currentShipping.price))
      : 'Calcule pelo CEP';
    if (totalEl) totalEl.textContent = money.format(total);
  }

  function renderFreeshipBar() {
    const fill = el('freeshipFill');
    const msg = el('freeshipMsg');
    if (!fill || !msg) return;

    const subtotal = getSubtotal();
    const pct = Math.min((subtotal / FREESHIP_MIN) * 100, 100);
    const remaining = Math.max(0, FREESHIP_MIN - subtotal);

    fill.style.width = `${pct}%`;

    if (pct >= 100) {
      msg.innerHTML = '🎉 Parabéns! Você ganhou <strong>frete grátis</strong>!';
    } else if (subtotal > 0) {
      msg.innerHTML = `Faltam <strong>${money.format(remaining)}</strong> para ganhar <strong>frete grátis</strong>!`;
    } else {
      msg.innerHTML = 'Adicione itens ao carrinho e ganhe <strong>frete grátis</strong> acima de R$&nbsp;399!';
    }
  }

  /* ── Mini Cart ── */
  function renderMiniCartItems() {
    const container = el('miniCartItems');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<p class="mini-cart-empty">Carrinho vazio</p>';
      return;
    }

    container.innerHTML = items.slice(0, 4).map(item => `
      <div class="mini-cart-item">
        <div class="mini-cart-img" style="background-image:url('${item.product.image || ''}')"></div>
        <div class="mini-cart-detail">
          <span class="mini-cart-name">${item.product.name}</span>
          <span class="mini-cart-price">${item.quantity}× ${money.format(item.product.price)}</span>
        </div>
      </div>
    `).join('');

    if (items.length > 4) {
      container.innerHTML += `<p class="mini-cart-more">+${items.length - 4} itens</p>`;
    }

    const subtotal = el('miniCartSubtotal');
    if (subtotal) subtotal.textContent = money.format(getSubtotal());
  }

  function showMiniCart() {
    const mc = el('miniCart');
    if (!mc || window.innerWidth < 840) return;
    mc.classList.add('visible');
    clearTimeout(miniCartTimeout);
    miniCartTimeout = setTimeout(() => mc.classList.remove('visible'), 3000);
  }

  function initMiniCart() {
    const cartBtn = el('openCart');
    const mc = el('miniCart');
    if (!cartBtn || !mc) return;

    cartBtn.addEventListener('mouseenter', () => {
      if (items.length > 0) {
        renderMiniCartItems();
        mc.classList.add('visible');
        clearTimeout(miniCartTimeout);
      }
    });

    cartBtn.parentElement.addEventListener('mouseleave', () => {
      miniCartTimeout = setTimeout(() => mc.classList.remove('visible'), 300);
    });

    mc.addEventListener('mouseenter', () => clearTimeout(miniCartTimeout));
    mc.addEventListener('mouseleave', () => {
      miniCartTimeout = setTimeout(() => mc.classList.remove('visible'), 300);
    });
  }

  /* ── Drawer ── */
  function openDrawer() {
    const drawer = el('cartDrawer');
    if (drawer) {
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawerEl() {
    const drawer = el('cartDrawer');
    if (drawer) {
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  /* ── Frete ── */
  function formatCep(v) {
    return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  }

  async function calculateShipping(cep) {
    if (!items.length) throw new Error('Adicione produtos ao carrinho antes de calcular.');
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) throw new Error('CEP inválido');

    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) throw new Error('Não foi possível consultar o CEP.');
    const addr = await res.json();
    if (addr.erro) throw new Error('CEP não encontrado.');

    const shipping = calcShippingByState(addr.uf, getTotalWeight(), getSubtotal());
    currentShipping = { ...shipping, address: addr };
    renderAll();
    return currentShipping;
  }

  function calcShippingByState(uf, weightGrams, subtotal) {
    const regionBase = {
      SP:{price:16.9,days:'2 a 4 dias úteis'},RJ:{price:22.9,days:'3 a 5 dias úteis'},
      MG:{price:21.9,days:'3 a 5 dias úteis'},ES:{price:24.9,days:'4 a 6 dias úteis'},
      PR:{price:23.9,days:'3 a 6 dias úteis'},SC:{price:25.9,days:'4 a 7 dias úteis'},
      RS:{price:27.9,days:'4 a 8 dias úteis'},DF:{price:28.9,days:'4 a 7 dias úteis'},
      GO:{price:29.9,days:'5 a 8 dias úteis'},MT:{price:34.9,days:'6 a 10 dias úteis'},
      MS:{price:32.9,days:'5 a 9 dias úteis'},BA:{price:33.9,days:'6 a 10 dias úteis'},
      SE:{price:35.9,days:'7 a 11 dias úteis'},AL:{price:36.9,days:'7 a 11 dias úteis'},
      PE:{price:36.9,days:'7 a 11 dias úteis'},PB:{price:38.9,days:'7 a 12 dias úteis'},
      RN:{price:39.9,days:'7 a 12 dias úteis'},CE:{price:39.9,days:'7 a 12 dias úteis'},
      PI:{price:41.9,days:'8 a 13 dias úteis'},MA:{price:42.9,days:'8 a 13 dias úteis'},
      PA:{price:45.9,days:'9 a 15 dias úteis'},AM:{price:54.9,days:'10 a 18 dias úteis'},
      AC:{price:57.9,days:'11 a 19 dias úteis'},RO:{price:52.9,days:'10 a 17 dias úteis'},
      RR:{price:59.9,days:'12 a 20 dias úteis'},AP:{price:58.9,days:'12 a 20 dias úteis'},
      TO:{price:44.9,days:'8 a 14 dias úteis'},
    };
    const base = regionBase[uf] || { price: 49.9, days: '8 a 15 dias úteis' };
    const extra = Math.max(0, Math.ceil((weightGrams - 500) / 500)) * 5.5;
    const price = subtotal >= FREESHIP_MIN ? 0 : base.price + extra;
    return { price, days: price === 0 ? 'Frete grátis 🎉' : base.days };
  }

  /* ── Checkout ── */
  async function createOrder(formData) {
    if (!window.EssenzaAuth?.isLoggedIn()) {
      EssenzaAuth.openModal('loginModal');
      throw new Error('Faça login para finalizar o pedido');
    }

    const orderData = {
      items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
      shipping_cost: currentShipping?.price || 0,
      shipping_name: formData.name,
      shipping_street: formData.street,
      shipping_number: formData.number,
      shipping_complement: formData.complement || null,
      shipping_neighborhood: formData.neighborhood,
      shipping_city: formData.city,
      shipping_state: formData.state,
      shipping_zip: formData.zip,
      shipping_estimate: formData.estimate || null,
      payment_method: formData.payment_method,
      notes: formData.notes || null,
    };

    const result = await EssenzaAuth.api('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    // Limpar carrinho local
    items = [];
    currentShipping = null;
    saveLocal();
    renderAll();

    return result;
  }

  /* ── WhatsApp ── */
  function buildWhatsAppMessage(orderNumber) {
    const details = items.map(i =>
      `• ${i.quantity}x ${i.product.name} — ${money.format(i.product.price * i.quantity)}`
    ).join('\n');

    const subtotal = getSubtotal();
    const freight = currentShipping?.price || 0;
    const total = subtotal + freight;

    const name = el('customerName')?.value || '';
    const cpf = el('customerCpf')?.value || '';
    const phone = el('customerPhone')?.value || '';
    const address = el('customerAddress')?.value || '';
    const number = el('customerNumber')?.value || '';
    const cep = el('checkoutCep')?.value || '';
    const payment = el('paymentMethod')?.value || '';

    return [
      `Olá, Essenza! Quero finalizar meu pedido${orderNumber ? ` #${orderNumber}` : ''}: 🛍️`,
      '', details, '',
      `Subtotal: ${money.format(subtotal)}`,
      `Frete: ${currentShipping ? money.format(freight) : 'a calcular'}`,
      `Total: ${money.format(total)}`,
      '', `Nome: ${name}`, `CPF: ${cpf}`, `Telefone: ${phone}`,
      `Endereço: ${address}, ${number}`, `CEP: ${cep}`, `Pagamento: ${payment}`,
    ].join('\n');
  }

  /* ── Init ── */
  function init() {
    items = loadLocal();
    initMiniCart();
    renderAll();

    // Open/close cart drawer
    el('openCart')?.addEventListener('click', openDrawer);
    el('closeCart')?.addEventListener('click', closeDrawerEl);

    // Close on overlay click
    const drawer = el('cartDrawer');
    if (drawer) drawer.addEventListener('click', e => { if (e.target === drawer) closeDrawerEl(); });

    // CEP formatting
    [el('cepInput'), el('checkoutCep')].forEach(input => {
      if (input) input.addEventListener('input', () => { input.value = formatCep(input.value); });
    });

    // Shipping calculation
    const shippingForm = el('shippingForm');
    if (shippingForm) {
      shippingForm.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = el('calcShippingBtn');
        btn.textContent = 'Consultando…'; btn.disabled = true;
        const result = el('shippingResult');
        result.textContent = '';

        try {
          const ship = await calculateShipping(el('cepInput').value);
          const cep = el('checkoutCep');
          const addr = el('customerAddress');
          if (cep) cep.value = el('cepInput').value;
          if (addr) addr.value = `${ship.address.logradouro}, ${ship.address.bairro}, ${ship.address.localidade} — ${ship.address.uf}`;
          const priceStr = ship.price === 0 ? 'Grátis 🎉' : money.format(ship.price);
          result.textContent = `${ship.address.localidade}/${ship.address.uf}: ${priceStr} • ${ship.days}`;
        } catch (err) {
          result.textContent = `⚠️ ${err.message}`;
        } finally {
          btn.textContent = 'Calcular Frete'; btn.disabled = false;
        }
      });
    }

    // Checkout CEP blur
    el('checkoutCep')?.addEventListener('blur', async () => {
      const cep = el('checkoutCep');
      if (cep.value.replace(/\D/g, '').length !== 8) return;
      try {
        const ship = await calculateShipping(cep.value);
        const addr = el('customerAddress');
        if (addr) addr.value = `${ship.address.logradouro}, ${ship.address.bairro}, ${ship.address.localidade} — ${ship.address.uf}`;
      } catch {}
    });

    // Checkout form
    const checkoutForm = el('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!items.length) {
          EssenzaApp.showToast('Seu carrinho está vazio.', '⚠️');
          return;
        }

        const whatsappNumber = '5500000000000'; // TODO: carregar do site_settings

        if (window.EssenzaAuth?.isLoggedIn()) {
          try {
            const addressParts = (el('customerAddress')?.value || '').split(',');
            const ship = currentShipping?.address || {};

            const result = await createOrder({
              name: el('customerName')?.value || '',
              street: ship.logradouro || addressParts[0]?.trim() || '',
              number: el('customerNumber')?.value || '',
              complement: '',
              neighborhood: ship.bairro || addressParts[1]?.trim() || '',
              city: ship.localidade || '',
              state: ship.uf || '',
              zip: el('checkoutCep')?.value?.replace(/\D/g, '') || '',
              payment_method: (el('paymentMethod')?.value || 'pix').toLowerCase().replace(/ /g, '_').replace('cartão_de_crédito', 'credit_card'),
            });

            const msg = encodeURIComponent(buildWhatsAppMessage(result.order_number));
            window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank', 'noreferrer');
            closeDrawerEl();
            EssenzaApp.showToast(`Pedido #${result.order_number} criado com sucesso!`, '🎉');
          } catch (err) {
            EssenzaApp.showToast(err.message, '⚠️');
          }
        } else {
          // Visitante — apenas WhatsApp
          const msg = encodeURIComponent(buildWhatsAppMessage());
          window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank', 'noreferrer');
        }
      });
    }

    // Sync com servidor se logado
    if (window.EssenzaAuth?.isLoggedIn()) {
      syncWithServer();
    }
  }

  return {
    init,
    addItem,
    changeQty,
    getItems: () => items,
    getCount,
    getSubtotal,
    syncWithServer,
    openDrawer,
    closeDrawer: closeDrawerEl,
    calculateShipping,
    money,
  };
})();
