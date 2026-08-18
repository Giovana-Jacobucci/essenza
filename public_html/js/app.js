/* ============================================================
   ESSENZA — App Core
   Catálogo, produtos, renderização e interações gerais
   ============================================================ */

const EssenzaApp = (() => {
  const API_URL = '/api/products';
  let products = [];
  let currentFilter = 'todos';
  let userFavorites = new Set();

  const fallbackImages = {
    Perfumes:   'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80',
    Vestidos:   'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
    Blusas:     'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80',
    Calças:     'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    Acessórios: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
    Roupas:     'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  };

  const parentCategoryMap = {
    'Vestidos Longos': 'Vestidos',
    'Vestidos Curtos': 'Vestidos',
    'Vestidos Midi': 'Vestidos',
    'Vestidos Florais': 'Vestidos',
    'T-Shirts': 'Blusas',
    'Croppeds': 'Blusas',
    'Blusas Sociais': 'Blusas',
    'Regatas': 'Blusas',
    'Calça Jeans': 'Calças',
    'Calça Social': 'Calças',
    'Legging': 'Calças',
    'Shorts': 'Calças',
    'Feminino': 'Perfumes',
    'Masculino': 'Perfumes',
    'Unissex': 'Perfumes',
    'Colares': 'Acessórios',
    'Brincos': 'Acessórios',
    'Pulseiras': 'Acessórios',
    'Bolsas': 'Acessórios',
    'Cintos': 'Acessórios',
  };

  const subcategoryMap = {
    'Vestidos':   ['Vestidos Longos', 'Vestidos Curtos', 'Vestidos Midi', 'Vestidos Florais'],
    'Blusas':     ['T-Shirts', 'Croppeds', 'Blusas Sociais', 'Regatas'],
    'Calças':     ['Calça Jeans', 'Calça Social', 'Legging', 'Shorts'],
    'Perfumes':   ['Feminino', 'Masculino', 'Unissex'],
    'Acessórios': ['Colares', 'Brincos', 'Pulseiras', 'Bolsas', 'Cintos'],
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
    let cat = p.category || 'Outros';
    let sub = p.subcategory || null;
    if (parentCategoryMap[cat]) {
      sub = cat;
      cat = parentCategoryMap[cat];
    }
    return {
      id: p.id,
      sku: p.sku || null,
      name: p.name,
      category: cat,
      subcategory: sub,
      price: parseFloat(p.price) || 0,
      compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      weight: parseInt(p.weight) || 0,
      stock: parseInt(p.stock) || 0,
      image: p.image || fallbackImages[cat] || fallbackImages.Roupas,
      description: p.description || '',
      isNew: p.is_new == 1 || p.is_new === true || p.isNew === true,
      isBestSeller: p.is_best_seller == 1 || p.is_best_seller === true || p.isBestSeller === true,
    };
  }

  function getDefaultProducts() {
    return [
      { id: crypto.randomUUID(), name: 'Vestido Longo Sublime', category: 'Vestidos', subcategory: 'Vestidos Longos', price: 289.9, weight: 400, stock: 6, image: fallbackImages.Vestidos, description: 'Vestido longo fluido com caimento impecável e detalhes sofisticados.', isNew: true },
      { id: crypto.randomUUID(), name: 'Vestido Midi Aurora', category: 'Vestidos', subcategory: 'Vestidos Midi', price: 229.9, weight: 360, stock: 8, image: fallbackImages.Vestidos, description: 'Vestido midi leve, elegante e confortável para diversas ocasiões.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Vestido Curto Brisa', category: 'Vestidos', subcategory: 'Vestidos Curtos', price: 199.9, weight: 300, stock: 5, image: fallbackImages.Vestidos, description: 'Vestido curto delicado para looks versáteis de dia e noite.' },
      { id: crypto.randomUUID(), name: 'Vestido Floral Jardim', category: 'Vestidos', subcategory: 'Vestidos Florais', price: 249.9, weight: 340, stock: 7, image: fallbackImages.Vestidos, description: 'Estampa floral exclusiva com tecido leve e toque suave.', isNew: true },
      
      { id: crypto.randomUUID(), name: 'Cropped Siena', category: 'Blusas', subcategory: 'Croppeds', price: 119.9, weight: 220, stock: 3, image: fallbackImages.Blusas, description: 'Blusa cropped com caimento ajustado e textura canelada premium.' },
      { id: crypto.randomUUID(), name: 'T-Shirt Essenza Algodão', category: 'Blusas', subcategory: 'T-Shirts', price: 99.9, weight: 180, stock: 15, image: fallbackImages.Blusas, description: 'T-shirt básica premium em algodão peruano macio.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Blusa Social Seda Pura', category: 'Blusas', subcategory: 'Blusas Sociais', price: 179.9, weight: 200, stock: 4, image: fallbackImages.Blusas, description: 'Blusa social com toque acetinado, ideal para ocasiões formais.' },
      { id: crypto.randomUUID(), name: 'Regata Canelada Chic', category: 'Blusas', subcategory: 'Regatas', price: 89.9, weight: 150, stock: 10, image: fallbackImages.Blusas, description: 'Regata com decote refinado e caimento que valoriza a silhueta.' },

      { id: crypto.randomUUID(), name: 'Calça Jeans Wide Leg', category: 'Calças', subcategory: 'Calça Jeans', price: 239.9, weight: 550, stock: 9, image: fallbackImages.Calças, description: 'Jeans de cintura alta com lavagem contemporânea e caimento solto.', isNew: true },
      { id: crypto.randomUUID(), name: 'Calça Reta Milano', category: 'Calças', subcategory: 'Calça Social', price: 259.9, weight: 400, stock: 6, image: fallbackImages.Calças, description: 'Calça reta em tecido premium, perfeita para looks casuais e sociais.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Legging Comfort Alta', category: 'Calças', subcategory: 'Legging', price: 149.9, weight: 280, stock: 12, image: fallbackImages.Calças, description: 'Legging com compressão suave e cós anatômico.' },
      { id: crypto.randomUUID(), name: 'Shorts Alfaiataria Paris', category: 'Calças', subcategory: 'Shorts', price: 159.9, weight: 260, stock: 8, image: fallbackImages.Calças, description: 'Shorts sofisticado com bolsos e acabamento estruturado.' },

      { id: crypto.randomUUID(), name: 'Essenza Floral 100ml', category: 'Perfumes', subcategory: 'Feminino', price: 189.9, weight: 420, stock: 12, image: fallbackImages.Perfumes, description: 'Perfume feminino floral com toque fresco e acabamento sofisticado.', isNew: true },
      { id: crypto.randomUUID(), name: 'Noir Élégance 50ml', category: 'Perfumes', subcategory: 'Feminino', price: 299.9, weight: 380, stock: 5, image: fallbackImages.Perfumes, description: 'Fragrância amadeirada intensa com base de sândalo e baunilha.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Essenza Homme Intense 100ml', category: 'Perfumes', subcategory: 'Masculino', price: 249.9, weight: 420, stock: 8, image: fallbackImages.Perfumes, description: 'Fragrância masculina marcante com notas amadeiradas e especiadas.' },
      { id: crypto.randomUUID(), name: 'Aura Boheme Unissex 100ml', category: 'Perfumes', subcategory: 'Unissex', price: 269.9, weight: 400, stock: 6, image: fallbackImages.Perfumes, description: 'Aroma cítrico aromático envolvente com acordes de bergamota.' },

      { id: crypto.randomUUID(), name: 'Colar Dourado Luz', category: 'Acessórios', subcategory: 'Colares', price: 69.9, weight: 80, stock: 20, image: fallbackImages.Acessórios, description: 'Acessório delicado para compor looks com brilho discreto.', isBestSeller: true },
      { id: crypto.randomUUID(), name: 'Brinco Argola Dourada', category: 'Acessórios', subcategory: 'Brincos', price: 59.9, weight: 40, stock: 18, image: fallbackImages.Acessórios, description: 'Argola clássica banhada a ouro para o dia a dia.' },
      { id: crypto.randomUUID(), name: 'Bolsa Couro Baguette', category: 'Acessórios', subcategory: 'Bolsas', price: 349.9, weight: 500, stock: 4, image: fallbackImages.Acessórios, description: 'Bolsa tiracolo em couro estruturado com acabamento premium.', isNew: true },
      { id: crypto.randomUUID(), name: 'Cinto Fivela Ouro', category: 'Acessórios', subcategory: 'Cintos', price: 89.9, weight: 120, stock: 10, image: fallbackImages.Acessórios, description: 'Cinto fino em couro com fivela minimalista dourada.' },
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
      if (currentFilter === 'todos') {
        return p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search);
      }

      if (currentSubcategoryFilter) {
        const normSub = currentSubcategoryFilter.toLowerCase();
        const kw = normSub.replace(/^vestidos\s+|^calças?\s+|^blusas?\s+/i, '');
        const matchSub = (
          (p.subcategory && p.subcategory.toLowerCase() === normSub) ||
          (p.category && p.category.toLowerCase() === normSub) ||
          p.name.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw)
        );
        return matchSub && (p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search));
      }

      const pParent = parentCategoryMap[p.category] || p.category;
      const matchCat = (p.category === currentFilter || pParent === currentFilter);
      return matchCat && (p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search));
    });

    grid.innerHTML = '';

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 48px 20px;">
          <p style="font-size: 1.1rem; margin-bottom: 14px; color: var(--muted);">Nenhum produto cadastrado nesta subcategoria no momento.</p>
          <a class="secondary-link" href="#/loja/${encodeURIComponent(currentFilter || 'todos')}" style="display:inline-block">Ver todos em ${currentFilter || 'todos'}</a>
        </div>
      `;
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
      if (userFavorites.has(product.id)) favBtn.classList.add('active');
      favBtn.type = 'button';
      favBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      favBtn.setAttribute('aria-label', 'Adicionar aos favoritos');
      favBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!window.EssenzaAuth?.isLoggedIn()) {
          EssenzaAuth.openModal('loginModal');
          return;
        }
        const isFav = favBtn.classList.contains('active');
        try {
          await EssenzaAuth.api(`/api/favorites/${product.id}`, {
            method: isFav ? 'DELETE' : 'POST',
          });
          favBtn.classList.toggle('active');
          showToast(isFav ? 'Removido dos favoritos' : 'Adicionado aos favoritos!', '❤️');
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

  /* ── Router and Filter Title Update ── */
  let currentSubcategoryFilter = null;

  function updateCatalogTitle(cat, subcat) {
    const titleEl = document.getElementById('catalogTitle');
    if (!titleEl) return;
    
    if (subcat) {
      titleEl.textContent = subcat;
    } else if (cat && cat !== 'todos') {
      titleEl.textContent = cat;
    } else {
      titleEl.textContent = 'Produtos em destaque';
    }
  }

  function handleRouting() {
    const rawHash = window.location.hash || '';
    const cleanHash = rawHash.replace(/^#\/?/, '');
    const searchInput = document.getElementById('searchInput');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const pills = document.getElementById('filterPills');

    const match = cleanHash.match(/^loja\/([^/]+)(?:\/([^/]+))?$/);

    if (match) {
      const cat = decodeURIComponent(match[1]).replace(/-/g, ' ');
      const subcat = match[2] ? decodeURIComponent(match[2]).replace(/-/g, ' ') : null;

      if (cat !== 'todos') {
        // Ativar modo de Página de Categoria / Subcategoria
        document.body.classList.add('is-category-page');
        currentFilter = cat;
        currentSubcategoryFilter = subcat;

        // Renderizar Breadcrumbs
        if (breadcrumbs) {
          if (subcat) {
            breadcrumbs.innerHTML = `
              <a href="#">Início</a>
              <span class="sep">›</span>
              <a href="#/loja/${encodeURIComponent(cat)}">${cat}</a>
              <span class="sep">›</span>
              <span>${subcat}</span>
            `;
          } else {
            breadcrumbs.innerHTML = `
              <a href="#">Início</a>
              <span class="sep">›</span>
              <span>${cat}</span>
            `;
          }
        }

        // Renderizar Pills de Subcategorias
        const subcategories = subcategoryMap[cat];
        if (pills && subcategories && subcategories.length) {
          let pillsHtml = `<a class="filter-pill ${!subcat ? 'active' : ''}" href="#/loja/${encodeURIComponent(cat)}">Todos em ${cat}</a>`;
          subcategories.forEach(s => {
            const slug = s.replace(/\s+/g, '-');
            const isActive = subcat === s;
            pillsHtml += `<a class="filter-pill ${isActive ? 'active' : ''}" href="#/loja/${encodeURIComponent(cat)}/${encodeURIComponent(slug)}">${s}</a>`;
          });
          pills.innerHTML = pillsHtml;
        }

        updateCatalogTitle(cat, subcat);
        if (searchInput) searchInput.value = '';
        renderProducts();

        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
    }

    // Modo Página Inicial (Home)
    document.body.classList.remove('is-category-page');
    currentFilter = 'todos';
    currentSubcategoryFilter = null;

    if (breadcrumbs) {
      breadcrumbs.innerHTML = '';
    }

    if (pills) {
      pills.innerHTML = `
        <button class="filter-pill active" data-filter="todos" type="button">Todos</button>
        <button class="filter-pill" data-filter="Vestidos" type="button">Vestidos</button>
        <button class="filter-pill" data-filter="Blusas" type="button">Blusas</button>
        <button class="filter-pill" data-filter="Calças" type="button">Calças</button>
        <button class="filter-pill" data-filter="Perfumes" type="button">Perfumes</button>
        <button class="filter-pill" data-filter="Acessórios" type="button">Acessórios</button>
      `;
    }

    updateCatalogTitle('todos', null);
    if (searchInput) searchInput.value = '';
    renderProducts();

    if (rawHash === '#loja') {
      const target = document.getElementById('loja');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /* ── Filter Pills ── */
  function initFilters() {
    const pills = document.getElementById('filterPills');
    const searchInput = document.getElementById('searchInput');

    if (pills) {
      pills.addEventListener('click', e => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Se for botão na home
        if (pill.dataset.filter) {
          pills.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const cat = pill.dataset.filter;
          if (cat === 'todos') {
            window.location.hash = '';
          } else {
            window.location.hash = `#/loja/${encodeURIComponent(cat)}`;
          }
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', renderProducts);
    }

    window.addEventListener('hashchange', handleRouting);
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

  /* ── Carregar favoritos do usuário ── */
  async function loadUserFavorites() {
    if (!window.EssenzaAuth?.isLoggedIn()) return;
    try {
      const favs = await EssenzaAuth.api('/api/favorites');
      userFavorites = new Set((favs || []).map(p => p.id));
      renderProducts();
    } catch {}
  }

  /* ── Init ── */
  async function init() {
    products = await loadProducts();
    initFilters();
    handleRouting();
    initScrollTop();
    initWhatsApp();
    observeReveal();

    // Inicializar carrinho após produtos carregados
    EssenzaCart.init();

    // Carregar favoritos quando o usuário estiver logado
    const waitForAuth = setInterval(() => {
      if (window.EssenzaAuth?.isLoggedIn()) {
        clearInterval(waitForAuth);
        loadUserFavorites();
      }
    }, 300);
    setTimeout(() => clearInterval(waitForAuth), 5000);
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
