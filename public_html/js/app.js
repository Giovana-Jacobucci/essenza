/* ============================================================
   ESSENZA — App Core
   Catálogo, produtos, renderização e interações gerais
   ============================================================ */

const EssenzaApp = (() => {
  const API_URL = '/api/products';
  let products = [];
  let currentFilter = 'todos';

  const fallbackImages = {
    Perfumes:   'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80',
    Vestidos:   'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
    Blusas:     'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80',
    Calças:     'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    Acessórios: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
    Roupas:     'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  };

  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  /* ── Toast ── */
  function showToast(message, icon = '✓', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  /* ── Carregar produtos ── */
  async function loadProducts() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      return (data.data || data).map(normalizeProduct);
    } catch (err) {
      console.warn('Fallback: produtos padrão locais', err);
      return getDefaultProducts();
    }
  }

  function normalizeProduct(p) {
    return {
      id: p.id,
      sku: p.sku || null,
      name: p.name,
      category: p.category || 'Outros',
      price: parseFloat(p.price),
      compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      weight: parseInt(p.weight) || 0,
      stock: parseInt(p.stock) || 0,
      image: p.image || fallbackImages[p.category] || fallbackImages.Roupas,
      description: p.description || '',
      isNew: p.is_new == 1 || p.is_new === true || p.isNew === true,
      isBestSeller: p.is_best_seller == 1 || p.is_best_seller === true || p.isBestSeller === true,
    };
  }

  function getDefaultProducts() {
    return [
      { id: crypto.randomUUID(), name: 'Essenza Floral 100ml', category: 'Perfumes', price: 189.9, weight: 420, stock: 12, image: fallbackImages.Perfumes, description: 'Perfume feminino floral com toque fresco e acabamento sofisticado.', isNew: true },
      { id: crypto.randomUUID(), name: 'Vestido Midi Aurora', category: 'Vestidos', price: 229.9, weight: 360, stock: 8, image: fallbackImages.Vestidos, description: 'Vestido midi leve, elegante e confortável para diversas ocasiões.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Cropped Siena', category: 'Blusas', price: 119.9, weight: 220, stock: 3, image: fallbackImages.Blusas, description: 'Blusa cropped com caimento ajustado e textura canelada premium.' },
      { id: crypto.randomUUID(), name: 'Colar Dourado Luz', category: 'Acessórios', price: 69.9, weight: 80, stock: 20, image: fallbackImages.Acessórios, description: 'Acessório delicado para compor looks com brilho discreto.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Calça Reta Milano', category: 'Calças', price: 259.9, weight: 400, stock: 6, image: fallbackImages.Calças, description: 'Calça reta em tecido premium, perfeita para looks casuais e sociais.', isNew: true },
      { id: crypto.randomUUID(), name: 'Noir Élégance 50ml', category: 'Perfumes', price: 299.9, weight: 380, stock: 5, image: fallbackImages.Perfumes, description: 'Fragrância amadeirada intensa com base de sândalo e baunilha.', isBestSeller: true },
    ];
  }

  /* ── Renderizar produtos ── */
  function renderProducts() {
    const grid = document.getElementById('productGrid');
    const searchInput = document.getElementById('searchInput');
    const template = document.getElementById('productCardTemplate');
    if (!grid || !template) return;

    const search = (searchInput?.value || '').trim().toLowerCase();
    const filtered = products.filter(p => {
      const matchCat = currentFilter === 'todos' || p.category === currentFilter;
      const matchSearch = p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search);
      return matchCat && matchSearch;
    });

    grid.innerHTML = '';

    if (!filtered.length) {
      grid.innerHTML = '<p class="empty-state">Nenhum produto encontrado para esta busca.</p>';
      return;
    }

    filtered.forEach(product => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector('.product-card');
      const image = node.querySelector('.product-image');
      const catEl = node.querySelector('.product-category');
      const title = node.querySelector('h3');
      const desc = node.querySelector('p');
      const price = node.querySelector('strong');
      const stock = node.querySelector('small');
      const button = node.querySelector('button');

      // Imagem
      const imgSrc = product.image || fallbackImages[product.category] || fallbackImages.Roupas;
      image.style.backgroundImage = `linear-gradient(135deg, rgba(23,21,19,.06), rgba(201,151,60,.1)), url("${imgSrc}")`;
      image.style.backgroundSize = 'cover';
      image.style.backgroundPosition = 'center';

      // Badges
      if (product.isNew) {
        const badge = document.createElement('div');
        badge.className = 'product-badge product-badge--new';
        badge.textContent = '✦ Novo';
        card.appendChild(badge);
      } else if (product.isBestSeller) {
        const badge = document.createElement('div');
        badge.className = 'product-badge product-badge--hot';
        badge.textContent = '🔥 Mais vendido';
        card.appendChild(badge);
      }

      if (product.stock <= 5 && product.stock > 0) {
        const badge = document.createElement('div');
        badge.className = 'product-badge product-badge--low';
        badge.style.top = (product.isNew || product.isBestSeller) ? '46px' : '14px';
        badge.textContent = `Restam ${product.stock}!`;
        card.appendChild(badge);
      }

      // Favorito (coração)
      const favBtn = document.createElement('button');
      favBtn.className = 'product-fav-btn';
      favBtn.type = 'button';
      favBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      favBtn.setAttribute('aria-label', 'Adicionar aos favoritos');
      favBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!window.EssenzaAuth?.isLoggedIn()) {
          EssenzaAuth.openModal('loginModal');
          return;
        }
        try {
          await EssenzaAuth.api('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ product_id: product.id }),
          });
          favBtn.classList.add('active');
          showToast('Adicionado aos favoritos!', '❤️');
        } catch {
          showToast('Erro ao favoritar', '⚠️');
        }
      });
      image.appendChild(favBtn);

      catEl.textContent = product.category;
      title.textContent = product.name;
      desc.textContent = product.description;
      price.textContent = money.format(product.price);
      stock.textContent = product.stock > 0 ? `${product.stock} em estoque` : 'Indisponível';
      if (product.stock > 0 && product.stock <= 5) stock.className = 'low-stock';

      button.disabled = product.stock <= 0;
      button.textContent = product.stock > 0 ? 'Adicionar ao Carrinho' : 'Sem estoque';
      button.addEventListener('click', () => EssenzaCart.addItem(product));

      card.dataset.productId = product.id;
      grid.appendChild(node);
    });

    observeReveal();
  }

  /* ── Reveal Animation ── */
  function observeReveal() {
    const items = document.querySelectorAll('.reveal:not(.visible)');
    if (!items.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach(el => observer.observe(el));
  }

  /* ── Filter Pills ── */
  function initFilters() {
    const pills = document.getElementById('filterPills');
    const searchInput = document.getElementById('searchInput');

    if (pills) {
      pills.addEventListener('click', e => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        pills.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        if (searchInput) searchInput.value = '';
        renderProducts();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', renderProducts);
    }

    // Category links (hero, footer, nav)
    document.querySelectorAll('[data-category-link]').forEach(link => {
      link.addEventListener('click', () => {
        const cat = link.dataset.categoryLink;
        currentFilter = cat;
        if (pills) {
          pills.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === cat);
          });
        }
        if (searchInput) searchInput.value = '';
        renderProducts();
      });
    });
  }

  /* ── Scroll to Top ── */
  function initScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── WhatsApp links ── */
  function initWhatsApp() {
    const waNumber = '5500000000000'; // TODO: carregar do site_settings
    const waHref = `https://wa.me/${waNumber}`;
    const whatsLink = document.getElementById('whatsLink');
    const whatsFloat = document.getElementById('whatsFloat');
    if (whatsLink) whatsLink.href = waHref;
    if (whatsFloat) whatsFloat.href = waHref;
  }

  /* ── Init ── */
  async function init() {
    products = await loadProducts();
    renderProducts();
    initFilters();
    initScrollTop();
    initWhatsApp();
    observeReveal();

    // Inicializar carrinho após produtos carregados
    EssenzaCart.init();
  }

  return {
    init,
    showToast,
    getProducts: () => products,
    renderProducts,
    money,
  };
})();

document.addEventListener('DOMContentLoaded', EssenzaApp.init);
