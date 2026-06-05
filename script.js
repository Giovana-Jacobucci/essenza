/* ============================================================
   ESSENZA — Script Principal
   Moda Feminina & Perfumaria
   ============================================================ */

const SITE_URL      = "https://essenzamodaeperfumaria.com";
const API_URL       = "api.php";
const CART_KEY      = "essenza_cart_v2";
const ADMIN_PIN     = "2026";
const WHATSAPP_NUMBER = "5500000000000"; // ← Altere para o número real: 55 + DDD + número
const FREESHIP_MIN  = 399;

/* ── Imagens fallback por categoria ── */
const fallbackImages = {
  Perfumes:   "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80",
  Vestidos:   "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
  Blusas:     "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
  Calças:     "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
  Acessórios: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
  // Legado
  Roupas:     "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
};

const subcategoriesMap = {
  Perfumes: ["Feminino", "Masculino", "Unissex"],
  Vestidos: ["Vestidos Longos", "Vestidos Curtos", "Vestidos Midi", "Vestidos Florais"],
  Blusas: ["T-Shirts", "Croppeds", "Blusas Sociais", "Regatas"],
  Calças: ["Calça Jeans", "Calça Social", "Legging", "Shorts"],
  Acessórios: []
};

/* ── Produtos padrão ── */
const defaultProducts = [
  {
    id: crypto.randomUUID(),
    name: "Essenza Floral 100ml",
    category: "Perfumes",
    price: 189.9,
    weight: 420,
    stock: 12,
    image: fallbackImages.Perfumes,
    description: "Perfume feminino floral com toque fresco e acabamento sofisticado.",
    isNew: true,
  },
  {
    id: crypto.randomUUID(),
    name: "Vestido Midi Aurora",
    category: "Vestidos",
    price: 229.9,
    weight: 360,
    stock: 8,
    image: fallbackImages.Vestidos,
    description: "Vestido midi leve, elegante e confortável para diversas ocasiões.",
    isBestSeller: true,
  },
  {
    id: crypto.randomUUID(),
    name: "Cropped Siena",
    category: "Blusas",
    price: 119.9,
    weight: 220,
    stock: 3,
    image: fallbackImages.Blusas,
    description: "Blusa cropped com caimento ajustado e textura canelada premium.",
  },
  {
    id: crypto.randomUUID(),
    name: "Colar Dourado Luz",
    category: "Acessórios",
    price: 69.9,
    weight: 80,
    stock: 20,
    image: fallbackImages.Acessórios,
    description: "Acessório delicado para compor looks com brilho discreto.",
    isBestSeller: true,
  },
  {
    id: crypto.randomUUID(),
    name: "Calça Reta Milano",
    category: "Calças",
    price: 259.9,
    weight: 400,
    stock: 6,
    image: fallbackImages.Calças,
    description: "Calça reta em tecido premium, perfeita para looks casuais e sociais.",
    isNew: true,
  },
  {
    id: crypto.randomUUID(),
    name: "Noir Élégance 50ml",
    category: "Perfumes",
    price: 299.9,
    weight: 380,
    stock: 5,
    image: fallbackImages.Perfumes,
    description: "Fragrância amadeirada intensa com base de sândalo e baunilha.",
    isBestSeller: true,
  },
];

/* ── Estado ── */
let products       = loadProducts();
let cart           = loadCart();
let currentShipping = null;
let currentFilter  = "todos";

/* ── Formatador de moeda ── */
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/* ── Referências DOM ── */
const els = {
  productGrid:      document.querySelector("#productGrid"),
  productTemplate:  document.querySelector("#productCardTemplate"),
  searchInput:      document.querySelector("#searchInput"),
  filterPills:      document.querySelector("#filterPills"),
  openCart:         document.querySelector("#openCart"),
  closeCart:        document.querySelector("#closeCart"),
  cartDrawer:       document.querySelector("#cartDrawer"),
  cartItems:        document.querySelector("#cartItems"),
  cartCount:        document.querySelector("#cartCount"),
  subtotalValue:    document.querySelector("#subtotalValue"),
  shippingValue:    document.querySelector("#shippingValue"),
  totalValue:       document.querySelector("#totalValue"),
  shippingForm:     document.querySelector("#shippingForm"),
  shippingResult:   document.querySelector("#shippingResult"),
  cepInput:         document.querySelector("#cepInput"),
  checkoutCep:      document.querySelector("#checkoutCep"),
  customerAddress:  document.querySelector("#customerAddress"),
  checkoutForm:     document.querySelector("#checkoutForm"),
  openAdmin:        document.querySelector("#openAdmin"),
  closeAdmin:       document.querySelector("#closeAdmin"),
  adminDrawer:      document.querySelector("#adminDrawer"),
  adminLogin:       document.querySelector("#adminLogin"),
  adminContent:     document.querySelector("#adminContent"),
  productForm:      document.querySelector("#productForm"),
  productSubcategory: document.querySelector("#productSubcategory"),
  resetProductForm: document.querySelector("#resetProductForm"),
  adminProductList: document.querySelector("#adminProductList"),
  whatsLink:        document.querySelector("#whatsLink"),
  whatsFloat:       document.querySelector("#whatsFloat"),
  freeshipFill:     document.querySelector("#freeshipFill"),
  freeshipMsg:      document.querySelector("#freeshipMsg"),
  toastContainer:   document.querySelector("#toastContainer"),
  scrollTopBtn:     document.querySelector("#scrollTop"),
};

/* ============================================================
   PERSISTÊNCIA
   ============================================================ */

async function loadProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Erro ao carregar produtos');
    const data = await response.json();
    return data.map(normalizeProduct);
  } catch (error) {
    console.error('Erro ao carregar produtos do banco:', error);
    // Fallback para produtos padrão em caso de erro
    return defaultProducts;
  }
}

function normalizeProduct(p) {
  // Normaliza categorias legadas e campos do banco
  const catMap = {
    "AcessÃ³rios": "Acessórios",
    "Acessórios": "Acessórios",
    "Roupas": "Vestidos", // migra legado para Vestidos
    "CalÃ§as": "Calças",
  };
  return {
    ...p,
    category: catMap[p.category] ?? p.category,
    subcategory: p.subcategory ?? null,
    isNew: p.is_new ?? p.isNew ?? false,
    isBestSeller: p.is_best_seller ?? p.isBestSeller ?? false,
    description: p.description
      .replaceAll("confortÃ¡vel", "confortável")
      .replaceAll("vÃ¡rias", "várias")
      .replaceAll("ocasiÃµes", "ocasiões")
      .replaceAll("AcessÃ³rio", "Acessório"),
  };
}

function loadCart() {
  const saved = localStorage.getItem(CART_KEY);
  return saved ? JSON.parse(saved) : [];
}

async function saveProducts() {
  // Produtos são salvos diretamente no banco via API
  // Esta função é mantida para compatibilidade, mas não faz nada
}

function saveCart()     { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

/* ============================================================
   TOAST
   ============================================================ */

function showToast(message, icon = "✓", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

/* ============================================================
   PROGRESSO FRETE GRÁTIS
   ============================================================ */

function updateFreeshipBar() {
  const subtotal  = getSubtotal();
  const pct       = Math.min((subtotal / FREESHIP_MIN) * 100, 100);
  const remaining = Math.max(0, FREESHIP_MIN - subtotal);

  els.freeshipFill.style.width = `${pct}%`;

  if (pct >= 100) {
    els.freeshipMsg.innerHTML = `🎉 Parabéns! Você ganhou <strong>frete grátis</strong>!`;
  } else if (subtotal > 0) {
    els.freeshipMsg.innerHTML = `Faltam <strong>${money.format(remaining)}</strong> para ganhar <strong>frete grátis</strong>!`;
  } else {
    els.freeshipMsg.innerHTML = `Adicione itens ao carrinho e ganhe <strong>frete grátis</strong> acima de R$&nbsp;399!`;
  }
}

/* ============================================================
   PRODUTOS — RENDERIZAÇÃO
   ============================================================ */

function renderProducts() {
  const search   = els.searchInput.value.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const matchCat    = currentFilter === "todos" || p.category === currentFilter;
    const matchSearch = p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  els.productGrid.innerHTML = "";

  if (!filtered.length) {
    els.productGrid.innerHTML = '<p class="empty-state">Nenhum produto encontrado para esta busca.</p>';
    return;
  }

  filtered.forEach((product) => {
    const node    = els.productTemplate.content.cloneNode(true);
    const card    = node.querySelector(".product-card");
    const image   = node.querySelector(".product-image");
    const catEl   = node.querySelector(".product-category");
    const title   = node.querySelector("h3");
    const desc    = node.querySelector("p");
    const price   = node.querySelector("strong");
    const stock   = node.querySelector("small");
    const button  = node.querySelector("button");

    // Imagem
    const imgSrc = product.image || fallbackImages[product.category] || fallbackImages.Roupas;
    image.style.backgroundImage =
      `linear-gradient(135deg, rgba(23,21,19,.06), rgba(201,151,60,.1)), url("${imgSrc}")`;
    image.style.backgroundSize     = "cover";
    image.style.backgroundPosition = "center";

    // Badges
    if (product.isNew) {
      const badge = document.createElement("div");
      badge.className = "product-badge product-badge--new";
      badge.textContent = "✦ Novo";
      card.appendChild(badge);
    } else if (product.isBestSeller) {
      const badge = document.createElement("div");
      badge.className = "product-badge product-badge--hot";
      badge.textContent = "🔥 Mais vendido";
      card.appendChild(badge);
    }

    if (product.stock <= 5 && product.stock > 0) {
      const badge = document.createElement("div");
      badge.className = "product-badge product-badge--low";
      badge.style.top = product.isNew || product.isBestSeller ? "46px" : "14px";
      badge.textContent = `Restam ${product.stock}!`;
      card.appendChild(badge);
    }

    catEl.textContent        = product.subcategory ? `${product.category} • ${product.subcategory}` : product.category;
    title.textContent        = product.name;
    desc.textContent         = product.description;
    price.textContent        = money.format(product.price);
    stock.textContent        = product.stock > 0 ? `${product.stock} em estoque` : "Indisponível";
    if (product.stock > 0 && product.stock <= 5) stock.className = "low-stock";

    button.disabled          = product.stock <= 0;
    button.textContent       = product.stock > 0 ? "Adicionar ao Carrinho" : "Sem estoque";
    button.addEventListener("click", () => addToCart(product.id));

    card.dataset.productId = product.id;
    els.productGrid.appendChild(node);
  });

  // Acionar reveal nas cards
  observeReveal();
}

/* ============================================================
   CARRINHO
   ============================================================ */

function addToCart(productId) {
  const product    = products.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;

  const line    = cart.find((l) => l.productId === productId);
  const current = line ? line.quantity : 0;
  if (current >= product.stock) {
    showToast("Limite de estoque atingido.", "⚠️");
    return;
  }

  if (line) line.quantity += 1;
  else cart.push({ productId, quantity: 1 });

  currentShipping = null;
  saveCart();
  renderCart();
  updateFreeshipBar();
  showToast(`<strong>${product.name}</strong> adicionado ao carrinho!`, "✓");
  openDrawer(els.cartDrawer);
}

function changeQty(productId, delta) {
  const product = products.find((p) => p.id === productId);
  const line    = cart.find((l) => l.productId === productId);
  if (!line || !product) return;

  line.quantity = Math.max(0, Math.min(product.stock, line.quantity + delta));
  cart = cart.filter((l) => l.quantity > 0);

  currentShipping = null;
  saveCart();
  renderCart();
  updateFreeshipBar();
}

function cartDetails() {
  return cart
    .map((l) => {
      const product = products.find((p) => p.id === l.productId);
      return product ? { ...l, product } : null;
    })
    .filter(Boolean);
}

function getSubtotal() {
  return cartDetails().reduce((sum, l) => sum + l.product.price * l.quantity, 0);
}

function getTotalWeight() {
  return cartDetails().reduce((sum, l) => sum + l.product.weight * l.quantity, 0);
}

function renderCart() {
  const details = cartDetails();
  const count   = details.reduce((s, l) => s + l.quantity, 0);
  els.cartCount.textContent = count;
  els.cartItems.innerHTML   = "";

  if (!details.length) {
    els.cartItems.innerHTML = '<p class="empty-state">Seu carrinho está vazio.<br><small>Explore nossos produtos e adicione o que desejar.</small></p>';
  }

  details.forEach((line) => {
    const row = document.createElement("div");
    row.className = "cart-line";
    row.innerHTML = `
      <div>
        <h4>${line.product.name}</h4>
        <span>${line.quantity} × ${money.format(line.product.price)}</span>
      </div>
      <div class="line-actions">
        <button type="button" aria-label="Diminuir quantidade">−</button>
        <strong>${line.quantity}</strong>
        <button type="button" aria-label="Aumentar quantidade">+</button>
      </div>
    `;
    const [minus, plus] = row.querySelectorAll("button");
    minus.addEventListener("click", () => changeQty(line.productId, -1));
    plus.addEventListener("click",  () => changeQty(line.productId, +1));
    els.cartItems.appendChild(row);
  });

  const subtotal = getSubtotal();
  const total    = subtotal + (currentShipping?.price || 0);
  els.subtotalValue.textContent = money.format(subtotal);
  els.shippingValue.textContent = currentShipping
    ? (currentShipping.price === 0 ? "🎉 Grátis" : money.format(currentShipping.price))
    : "Calcule pelo CEP";
  els.totalValue.textContent = money.format(total);
}

/* ============================================================
   CEP / FRETE
   ============================================================ */

function formatCep(v) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function onlyDigits(v) { return v.replace(/\D/g, ""); }

async function fetchAddress(cep) {
  const clean = onlyDigits(cep);
  if (clean.length !== 8) throw new Error("Digite um CEP com 8 números.");
  const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!res.ok) throw new Error("Não foi possível consultar o CEP.");
  const data = await res.json();
  if (data.erro) throw new Error("CEP não encontrado.");
  return data;
}

function calcShippingByState(uf, weightGrams, subtotal) {
  const regionBase = {
    SP: { price: 16.9,  days: "2 a 4 dias úteis" },
    RJ: { price: 22.9,  days: "3 a 5 dias úteis" },
    MG: { price: 21.9,  days: "3 a 5 dias úteis" },
    ES: { price: 24.9,  days: "4 a 6 dias úteis" },
    PR: { price: 23.9,  days: "3 a 6 dias úteis" },
    SC: { price: 25.9,  days: "4 a 7 dias úteis" },
    RS: { price: 27.9,  days: "4 a 8 dias úteis" },
    DF: { price: 28.9,  days: "4 a 7 dias úteis" },
    GO: { price: 29.9,  days: "5 a 8 dias úteis" },
    MT: { price: 34.9,  days: "6 a 10 dias úteis" },
    MS: { price: 32.9,  days: "5 a 9 dias úteis" },
    BA: { price: 33.9,  days: "6 a 10 dias úteis" },
    SE: { price: 35.9,  days: "7 a 11 dias úteis" },
    AL: { price: 36.9,  days: "7 a 11 dias úteis" },
    PE: { price: 36.9,  days: "7 a 11 dias úteis" },
    PB: { price: 38.9,  days: "7 a 12 dias úteis" },
    RN: { price: 39.9,  days: "7 a 12 dias úteis" },
    CE: { price: 39.9,  days: "7 a 12 dias úteis" },
    PI: { price: 41.9,  days: "8 a 13 dias úteis" },
    MA: { price: 42.9,  days: "8 a 13 dias úteis" },
    PA: { price: 45.9,  days: "9 a 15 dias úteis" },
    AM: { price: 54.9,  days: "10 a 18 dias úteis" },
    AC: { price: 57.9,  days: "11 a 19 dias úteis" },
    RO: { price: 52.9,  days: "10 a 17 dias úteis" },
    RR: { price: 59.9,  days: "12 a 20 dias úteis" },
    AP: { price: 58.9,  days: "12 a 20 dias úteis" },
    TO: { price: 44.9,  days: "8 a 14 dias úteis" },
  };
  const base     = regionBase[uf] || { price: 49.9, days: "8 a 15 dias úteis" };
  const extra    = Math.max(0, Math.ceil((weightGrams - 500) / 500)) * 5.5;
  const price    = subtotal >= FREESHIP_MIN ? 0 : base.price + extra;
  return { price, days: price === 0 ? "Frete grátis 🎉" : base.days };
}

async function calculateShipping(cep) {
  const details = cartDetails();
  if (!details.length) throw new Error("Adicione produtos ao carrinho antes de calcular.");
  const address  = await fetchAddress(cep);
  const subtotal = getSubtotal();
  const shipping = calcShippingByState(address.uf, getTotalWeight(), subtotal);
  currentShipping = { ...shipping, address };
  renderCart();
  return currentShipping;
}

/* ============================================================
   DRAWERS
   ============================================================ */

function openDrawer(drawer) {
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer(drawer) {
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* ============================================================
   ADMIN
   ============================================================ */

async function renderAdminList() {
  els.adminProductList.innerHTML = "";
  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div>
        <h4>${product.name}</h4>
        <span>${product.category} • ${money.format(product.price)} • Estoque: ${product.stock}</span>
      </div>
      <div class="admin-actions">
        <button type="button">Editar</button>
        <button type="button">Excluir</button>
      </div>
    `;
    const [edit, del] = row.querySelectorAll("button");
    edit.addEventListener("click", () => fillProductForm(product));
    del.addEventListener("click", async () => {
      if (!confirm(`Excluir "${product.name}"?`)) return;
      try {
        const response = await fetch(`${API_URL}/products/${product.id}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erro ao excluir produto');
        
        products = products.filter((p) => p.id !== product.id);
        cart     = cart.filter((l)     => l.productId !== product.id);
        saveCart();
        renderProducts(); renderCart(); renderAdminList();
        showToast("Produto excluído.", "🗑️");
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showToast("Erro ao excluir produto.", "⚠️");
      }
    });
    els.adminProductList.appendChild(row);
  });
}

function fillProductForm(product) {
  document.querySelector("#productId").value          = product.id;
  document.querySelector("#productName").value        = product.name;
  document.querySelector("#productCategory").value    = product.category;
  updateSubcategorySelect(product.category);
  document.querySelector("#productSubcategory").value = product.subcategory || "";
  document.querySelector("#productPrice").value       = product.price;
  document.querySelector("#productWeight").value      = product.weight;
  document.querySelector("#productStock").value       = product.stock;
  document.querySelector("#productImage").value       = product.image || "";
  document.querySelector("#productDescription").value = product.description;
}

function resetProductForm() {
  els.productForm.reset();
  document.querySelector("#productId").value = "";
  updateSubcategorySelect(document.querySelector("#productCategory").value);
}

/* ============================================================
   PEDIDO WHATSAPP
   ============================================================ */

function buildOrderMessage() {
  const details  = cartDetails();
  const items    = details
    .map((l) => `• ${l.quantity}x ${l.product.name} — ${money.format(l.product.price * l.quantity)}`)
    .join("\n");
  const subtotal = getSubtotal();
  const freight  = currentShipping?.price || 0;
  const total    = subtotal + freight;

  return [
    "Olá, Essenza! Quero finalizar meu pedido: 🛍️",
    "",
    items,
    "",
    `Subtotal: ${money.format(subtotal)}`,
    `Frete: ${currentShipping ? money.format(freight) : "a calcular"}`,
    `Total: ${money.format(total)}`,
    "",
    `Nome: ${document.querySelector("#customerName").value}`,
    `CPF: ${document.querySelector("#customerCpf").value}`,
    `Telefone: ${document.querySelector("#customerPhone").value}`,
    `Endereço: ${document.querySelector("#customerAddress").value}, ${document.querySelector("#customerNumber").value}`,
    `CEP: ${els.checkoutCep.value}`,
    `Pagamento: ${document.querySelector("#paymentMethod").value}`,
  ].join("\n");
}

/* ============================================================
   REVEAL (IntersectionObserver)
   ============================================================ */

function observeReveal() {
  const items = document.querySelectorAll(".reveal:not(.visible)");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((el) => observer.observe(el));
}

/* ============================================================
   SCROLL TO TOP
   ============================================================ */

window.addEventListener("scroll", () => {
  const visible = window.scrollY > 400;
  els.scrollTopBtn.classList.toggle("visible", visible);
}, { passive: true });

els.scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ============================================================
   FILTER PILLS
   ============================================================ */

els.filterPills.addEventListener("click", (e) => {
  const pill = e.target.closest(".filter-pill");
  if (!pill) return;

  // Atualizar estado visual
  els.filterPills.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
  pill.classList.add("active");

  currentFilter = pill.dataset.filter;
  els.searchInput.value = "";
  renderProducts();
});

/* ============================================================
   LINKS DE CATEGORIA (hero, footer, nav, etc.)
   ============================================================ */

document.querySelectorAll("[data-category-link]").forEach((link) => {
  link.addEventListener("click", (e) => {
    const cat = link.dataset.categoryLink;
    currentFilter = cat;

    // Sincronizar pills
    const pills = els.filterPills.querySelectorAll(".filter-pill");
    pills.forEach((p) => {
      p.classList.toggle("active", p.dataset.filter === cat);
    });

    els.searchInput.value = "";
    renderProducts();
  });
});

/* ============================================================
   EVENTOS GERAIS
   ============================================================ */

// Busca
els.searchInput.addEventListener("input", renderProducts);

// Carrinho
els.openCart.addEventListener("click",  () => openDrawer(els.cartDrawer));
els.closeCart.addEventListener("click", () => closeDrawer(els.cartDrawer));

// Admin
els.openAdmin.addEventListener("click",  () => openDrawer(els.adminDrawer));
els.closeAdmin.addEventListener("click", () => closeDrawer(els.adminDrawer));

// Fechar drawer ao clicar no overlay
[els.cartDrawer, els.adminDrawer].forEach((drawer) => {
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) closeDrawer(drawer);
  });
});

// Fechar com Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDrawer(els.cartDrawer);
    closeDrawer(els.adminDrawer);
  }
});

// Formatação de CEP
[els.cepInput, els.checkoutCep].forEach((input) => {
  input.addEventListener("input", () => { input.value = formatCep(input.value); });
});

// Calcular frete
els.shippingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.querySelector("#calcShippingBtn");
  btn.textContent = "Consultando…";
  btn.disabled    = true;
  els.shippingResult.textContent = "";

  try {
    const ship = await calculateShipping(els.cepInput.value);
    els.checkoutCep.value      = els.cepInput.value;
    els.customerAddress.value  = `${ship.address.logradouro}, ${ship.address.bairro}, ${ship.address.localidade} — ${ship.address.uf}`;
    const priceStr = ship.price === 0 ? "Grátis 🎉" : money.format(ship.price);
    els.shippingResult.textContent = `${ship.address.localidade}/${ship.address.uf}: ${priceStr} • ${ship.days}`;
  } catch (err) {
    els.shippingResult.textContent = `⚠️ ${err.message}`;
  } finally {
    btn.textContent = "Calcular Frete";
    btn.disabled    = false;
  }
});

// CEP no checkout
els.checkoutCep.addEventListener("blur", async () => {
  if (onlyDigits(els.checkoutCep.value).length !== 8) return;
  try {
    const ship             = await calculateShipping(els.checkoutCep.value);
    els.customerAddress.value = `${ship.address.logradouro}, ${ship.address.bairro}, ${ship.address.localidade} — ${ship.address.uf}`;
  } catch (err) {
    els.shippingValue.textContent = `⚠️ ${err.message}`;
  }
});

// Finalizar pedido
els.checkoutForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cartDetails().length) {
    showToast("Seu carrinho está vazio.", "⚠️");
    return;
  }
  const message = encodeURIComponent(buildOrderMessage());
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank", "noreferrer");
});

// Login admin
els.adminLogin.addEventListener("submit", (e) => {
  e.preventDefault();
  if (document.querySelector("#adminPassword").value !== ADMIN_PIN) {
    showToast("Senha incorreta. A senha inicial é 2026.", "⚠️");
    return;
  }
  els.adminLogin.hidden    = true;
  els.adminContent.hidden  = false;
  renderAdminList();
});

// Salvar produto
els.productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id      = document.querySelector("#productId").value || crypto.randomUUID();
  const product = {
    id,
    name:        document.querySelector("#productName").value.trim(),
    category:    document.querySelector("#productCategory").value,
    subcategory: document.querySelector("#productSubcategory").value || null,
    price:       Number(document.querySelector("#productPrice").value),
    weight:      Number(document.querySelector("#productWeight").value),
    stock:       Number(document.querySelector("#productStock").value),
    image:       document.querySelector("#productImage").value.trim(),
    description: document.querySelector("#productDescription").value.trim(),
    isNew:       false,
    isBestSeller: false,
  };

  const exists = products.some((p) => p.id === id);
  const method = exists ? 'PUT' : 'POST';
  const url = exists ? `${API_URL}/products/${id}` : `${API_URL}/products`;

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) throw new Error('Erro ao salvar produto');

    // Atualizar estado local
    products = exists
      ? products.map((p) => (p.id === id ? product : p))
      : [product, ...products];

    resetProductForm();
    renderProducts();
    renderAdminList();
    showToast(exists ? "Produto atualizado!" : "Produto adicionado!", "✓");
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    showToast("Erro ao salvar produto.", "⚠️");
  }
});

els.resetProductForm.addEventListener("click", resetProductForm);

function updateSubcategorySelect(category) {
  if (!els.productSubcategory) return;
  els.productSubcategory.innerHTML = '<option value="">Nenhuma</option>';
  const list = subcategoriesMap[category] || [];
  list.forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    els.productSubcategory.appendChild(opt);
  });
}

if (document.querySelector("#productCategory")) {
  document.querySelector("#productCategory").addEventListener("change", (e) => {
    updateSubcategorySelect(e.target.value);
  });
  updateSubcategorySelect(document.querySelector("#productCategory").value);
}

/* ============================================================
   WHATSAPP
   ============================================================ */

const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;
els.whatsLink.href  = waHref;
els.whatsFloat.href = waHref;

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function init() {
  products = await loadProducts();
  renderProducts();
  renderCart();
  updateFreeshipBar();
  observeReveal();
}

init();
