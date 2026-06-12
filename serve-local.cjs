const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, 'public_html');
const dbPath = path.join(__dirname, 'serve-local-db.json');
const port = Number(process.env.PORT || 5500);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
};

// ── Banco de dados Mock local ──
function loadDb() {
  if (!fs.existsSync(dbPath)) {
    const initialDb = {
      users: [
        {
          id: "admin-uuid",
          name: "Administrador Essenza",
          email: "admin@essenza.com",
          cpf: "111.111.111-11",
          phone: "(11) 99999-9999",
          birth_date: "1990-01-01",
          password: "2026",
          role: "admin",
          created_at: "2026-06-12T00:00:00Z"
        },
        {
          id: "customer-uuid",
          name: "Giovana Jacobucci",
          email: "cliente@essenza.com",
          cpf: "222.222.222-22",
          phone: "(11) 98888-8888",
          birth_date: "1995-05-15",
          password: "123456",
          role: "customer",
          created_at: "2026-06-12T00:00:00Z"
        }
      ],
      products: [
        {
          id: "p1",
          sku: "ESS-PERF-001",
          name: "Essenza Floral 100ml",
          price: 189.90,
          weight: 420,
          stock: 12,
          image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80",
          description: "Perfume feminino floral com toque fresco e acabamento sofisticado.",
          category: "Perfumes",
          is_new: 1,
          is_best_seller: 0
        },
        {
          id: "p2",
          sku: "ESS-VEST-001",
          name: "Vestido Midi Aurora",
          price: 229.90,
          weight: 360,
          stock: 8,
          image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
          description: "Vestido midi leve, elegante e confortável para diversas ocasiões.",
          category: "Vestidos",
          is_new: 0,
          is_best_seller: 1
        },
        {
          id: "p3",
          sku: "ESS-BLUS-001",
          name: "Cropped Siena",
          price: 119.90,
          weight: 220,
          stock: 3,
          image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
          description: "Blusa cropped com caimento ajustado e textura canelada premium.",
          category: "Blusas",
          is_new: 0,
          is_best_seller: 0
        },
        {
          id: "p4",
          sku: "ESS-ACES-001",
          name: "Colar Dourado Luz",
          price: 69.90,
          weight: 80,
          stock: 20,
          image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
          description: "Acessório delicado para compor looks com brilho discreto.",
          category: "Acessórios",
          is_new: 0,
          is_best_seller: 1
        },
        {
          id: "p5",
          sku: "ESS-CALC-001",
          name: "Calça Reta Milano",
          price: 259.90,
          weight: 400,
          stock: 6,
          image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
          description: "Calça reta em tecido premium, perfeita para looks casuais e sociais.",
          category: "Calças",
          is_new: 1,
          is_best_seller: 0
        },
        {
          id: "p6",
          sku: "ESS-PERF-002",
          name: "Noir Élégance 50ml",
          price: 299.90,
          weight: 380,
          stock: 5,
          image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80",
          description: "Fragrância amadeirada intensa com base de sândalo e baunilha.",
          category: "Perfumes",
          is_new: 0,
          is_best_seller: 1
        }
      ],
      addresses: [
        {
          id: "addr-1",
          user_id: "customer-uuid",
          label: "Casa",
          recipient: "Giovana Jacobucci",
          street: "Av. Paulista",
          number: "1000",
          complement: "Apto 101",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          zip_code: "01310-100",
          is_default: true
        }
      ],
      orders: [
        {
          id: "order-1",
          order_number: 1001,
          user_id: "customer-uuid",
          status: "delivered",
          status_label: "Entregue",
          subtotal: "229.90",
          shipping_cost: "0.00",
          discount: "0.00",
          total: "229.90",
          payment_label: "PIX",
          shipping_name: "Giovana Jacobucci",
          shipping_street: "Av. Paulista",
          shipping_number: "1000",
          shipping_complement: "Apto 101",
          shipping_neighborhood: "Bela Vista",
          shipping_city: "São Paulo",
          shipping_state: "SP",
          shipping_zip: "01310-100",
          formatted_date: "10/06/2026",
          status_history: [
            { status: "pending_payment", status_label: "Pedido Recebido", date: "10/06/2026", time: "14:30" },
            { status: "paid", status_label: "Pagamento Aprovado", date: "10/06/2026", time: "14:35" },
            { status: "processing", status_label: "Em Separação", date: "10/06/2026", time: "16:00" },
            { status: "shipped", status_label: "Enviado", date: "11/06/2026", time: "09:00" },
            { status: "out_for_delivery", status_label: "Saiu para Entrega", date: "11/06/2026", time: "13:00" },
            { status: "delivered", status_label: "Entregue", date: "11/06/2026", time: "15:30" }
          ],
          items: [
            {
              product_name: "Vestido Midi Aurora",
              product_sku: "ESS-VEST-001",
              quantity: 1,
              unit_price: "229.90",
              total_price: "229.90",
              image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"
            }
          ]
        }
      ],
      favorites: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), "utf8");
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function getJsonBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function getSessionUser(req, db) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/mock_session=([^;]+)/);
  if (!match) return null;
  const userId = match[1];
  return db.users.find(u => u.id === userId) || null;
}

function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) {
      d += cpf[c] * ((t + 1) - c);
    }
    d = ((10 * d) % 11) % 10;
    if (cpf[t] != d) return false;
  }
  return true;
}

function validatePhone(phone) {
  if (!phone) return true;
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  return true;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${port}`);
  const requested = decodeURIComponent(parsedUrl.pathname);

  // ── Interceptar Rotas da API Mock ──
  if (requested.startsWith("/api")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const db = loadDb();
    const currentUser = getSessionUser(req, db);
    const method = req.method;
    const subpath = requested.replace(/^\/api/, "").replace(/\/$/, "");

    // Status / Labels Helpers
    const statusLabels = {
      pending_payment: "Aguardando Pagamento",
      paid: "Pago",
      processing: "Em Separação",
      shipped: "Enviado",
      out_for_delivery: "Saiu para Entrega",
      delivered: "Entregue",
      cancelled: "Cancelado"
    };

    // ── Endpoint: /api/auth/me ──
    if (subpath === "/auth/me" && method === "GET") {
      if (!currentUser) {
        res.end(JSON.stringify({ user: null }));
      } else {
        res.end(JSON.stringify({ user: currentUser, csrf_token: "mock-csrf-token" }));
      }
      return;
    }

    // ── Endpoint: /api/auth/login ──
    if (subpath === "/auth/login" && method === "POST") {
      const body = await getJsonBody(req);
      const { identifier, password } = body;
      const cleanId = (identifier || "").replace(/\D/g, "");
      
      const user = db.users.find(u => 
        (u.email === identifier || u.cpf.replace(/\D/g, "") === cleanId) && 
        u.password === password
      );

      if (!user) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Credenciais inválidas" }));
        return;
      }

      res.setHeader("Set-Cookie", `mock_session=${user.id}; Path=/; HttpOnly; SameSite=Lax`);
      res.end(JSON.stringify({ user, csrf_token: "mock-csrf-token", message: "Login efetuado" }));
      return;
    }

    // ── Endpoint: /api/auth/register ──
    if (subpath === "/auth/register" && method === "POST") {
      const body = await getJsonBody(req);
      const { name, email, cpf, phone, birth_date, password } = body;

      if (!name || !email || !cpf || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Campos obrigatórios ausentes" }));
        return;
      }

      if (!validateCPF(cpf)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "CPF inválido" }));
        return;
      }

      if (phone && !validatePhone(phone)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Telefone inválido" }));
        return;
      }

      const exists = db.users.find(u => u.email === email || u.cpf === cpf);
      if (exists) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "E-mail ou CPF já cadastrado" }));
        return;
      }

      const newUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        name,
        email,
        cpf,
        phone: phone || null,
        birth_date: birth_date || null,
        password,
        role: "customer",
        created_at: new Date().toISOString()
      };

      db.users.push(newUser);
      saveDb(db);

      res.setHeader("Set-Cookie", `mock_session=${newUser.id}; Path=/; HttpOnly; SameSite=Lax`);
      res.end(JSON.stringify({ user: newUser, csrf_token: "mock-csrf-token", message: "Conta criada" }));
      return;
    }

    // ── Endpoint: /api/auth/logout ──
    if (subpath === "/auth/logout" && method === "POST") {
      res.setHeader("Set-Cookie", "mock_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
      res.end(JSON.stringify({ message: "Logout efetuado" }));
      return;
    }

    // ── Endpoint: /api/products ──
    if (subpath === "/products" && method === "GET") {
      const search = parsedUrl.searchParams.get("search") || "";
      const cat = parsedUrl.searchParams.get("category") || "";
      let list = db.products;

      if (search) {
        list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())));
      }
      if (cat) {
        list = list.filter(p => p.category.toLowerCase() === cat.toLowerCase());
      }

      res.end(JSON.stringify({
        data: list,
        pagination: { page: 1, total_pages: 1, total_items: list.length }
      }));
      return;
    }

    // ── Endpoint: /api/products (POST - Admin) ──
    if (subpath === "/products" && method === "POST") {
      if (!currentUser || currentUser.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Não autorizado" }));
        return;
      }
      const body = await getJsonBody(req);
      const newProduct = {
        id: "p-" + Math.random().toString(36).substr(2, 9),
        sku: body.sku || "",
        name: body.name,
        price: parseFloat(body.price),
        weight: parseInt(body.weight) || 0,
        stock: parseInt(body.stock) || 0,
        image: body.image,
        description: body.description,
        category: body.category || "Geral",
        is_new: body.is_new ? 1 : 0,
        is_best_seller: body.is_best_seller ? 1 : 0
      };
      db.products.push(newProduct);
      saveDb(db);
      res.end(JSON.stringify(newProduct));
      return;
    }

    // ── Endpoint: /api/products/:id (GET / PUT / DELETE) ──
    const prodMatch = subpath.match(/^\/products\/([^\/]+)$/);
    if (prodMatch) {
      const prodId = prodMatch[1];
      const prodIdx = db.products.findIndex(p => p.id === prodId);

      if (prodIdx === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Produto não encontrado" }));
        return;
      }

      if (method === "GET") {
        res.end(JSON.stringify(db.products[prodIdx]));
        return;
      }

      if (!currentUser || currentUser.role !== "admin") {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Não autorizado" }));
        return;
      }

      if (method === "PUT") {
        const body = await getJsonBody(req);
        db.products[prodIdx] = {
          ...db.products[prodIdx],
          sku: body.sku || db.products[prodIdx].sku,
          name: body.name || db.products[prodIdx].name,
          price: body.price !== undefined ? parseFloat(body.price) : db.products[prodIdx].price,
          weight: body.weight !== undefined ? parseInt(body.weight) : db.products[prodIdx].weight,
          stock: body.stock !== undefined ? parseInt(body.stock) : db.products[prodIdx].stock,
          image: body.image || db.products[prodIdx].image,
          description: body.description || db.products[prodIdx].description,
          is_new: body.is_new ? 1 : 0,
          is_best_seller: body.is_best_seller ? 1 : 0
        };
        saveDb(db);
        res.end(JSON.stringify(db.products[prodIdx]));
        return;
      }

      if (method === "DELETE") {
        // Soft delete / remove
        db.products.splice(prodIdx, 1);
        saveDb(db);
        res.end(JSON.stringify({ message: "Produto removido" }));
        return;
      }
    }

    // Requisições abaixo requerem usuário logado
    if (!currentUser) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Sessão expirada ou não autenticado" }));
      return;
    }

    // ── Endpoint: /api/users/profile (PUT) ──
    if (subpath === "/users/profile" && method === "PUT") {
      const body = await getJsonBody(req);

      if (body.phone && !validatePhone(body.phone)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Telefone inválido" }));
        return;
      }

      const userIdx = db.users.findIndex(u => u.id === currentUser.id);
      db.users[userIdx].name = body.name || db.users[userIdx].name;
      db.users[userIdx].email = body.email || db.users[userIdx].email;
      db.users[userIdx].phone = body.phone || db.users[userIdx].phone;
      saveDb(db);
      res.end(JSON.stringify({ message: "Perfil atualizado" }));
      return;
    }

    // ── Endpoint: /api/addresses ──
    if (subpath === "/addresses" && method === "GET") {
      const list = db.addresses.filter(a => a.user_id === currentUser.id);
      res.end(JSON.stringify(list));
      return;
    }

    if (subpath === "/addresses" && method === "POST") {
      const body = await getJsonBody(req);
      if (body.is_default) {
        db.addresses.forEach(a => { if (a.user_id === currentUser.id) a.is_default = false; });
      }
      const newAddress = {
        id: "addr-" + Math.random().toString(36).substr(2, 9),
        user_id: currentUser.id,
        label: body.label || "Casa",
        recipient: body.recipient,
        street: body.street,
        number: body.number,
        complement: body.complement || null,
        neighborhood: body.neighborhood,
        city: body.city,
        state: body.state,
        zip_code: body.zip_code,
        is_default: !!body.is_default
      };
      db.addresses.push(newAddress);
      saveDb(db);
      res.end(JSON.stringify(newAddress));
      return;
    }

    // ── Endpoint: /api/addresses/:id ──
    const addrMatch = subpath.match(/^\/addresses\/([^\/]+)$/);
    if (addrMatch && (method === "PUT" || method === "DELETE")) {
      const addrId = addrMatch[1];
      const addrIdx = db.addresses.findIndex(a => a.id === addrId && a.user_id === currentUser.id);

      if (addrIdx === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Endereço não encontrado" }));
        return;
      }

      if (method === "DELETE") {
        db.addresses.splice(addrIdx, 1);
        saveDb(db);
        res.end(JSON.stringify({ message: "Endereço excluído" }));
        return;
      }

      if (method === "PUT") {
        const body = await getJsonBody(req);
        if (body.is_default) {
          db.addresses.forEach(a => { if (a.user_id === currentUser.id) a.is_default = false; });
        }
        db.addresses[addrIdx] = {
          ...db.addresses[addrIdx],
          label: body.label || db.addresses[addrIdx].label,
          recipient: body.recipient || db.addresses[addrIdx].recipient,
          street: body.street || db.addresses[addrIdx].street,
          number: body.number || db.addresses[addrIdx].number,
          complement: body.complement || null,
          neighborhood: body.neighborhood || db.addresses[addrIdx].neighborhood,
          city: body.city || db.addresses[addrIdx].city,
          state: body.state || db.addresses[addrIdx].state,
          zip_code: body.zip_code || db.addresses[addrIdx].zip_code,
          is_default: !!body.is_default
        };
        saveDb(db);
        res.end(JSON.stringify(db.addresses[addrIdx]));
        return;
      }
    }

    // ── Endpoint: /api/favorites ──
    if (subpath === "/favorites" && method === "GET") {
      const userFavs = db.favorites.filter(f => f.user_id === currentUser.id);
      const list = userFavs.map(f => {
        const prod = db.products.find(p => p.id === f.product_id);
        return prod ? prod : null;
      }).filter(Boolean);
      res.end(JSON.stringify(list));
      return;
    }

    // ── Endpoint: /api/favorites/:id ──
    const favMatch = subpath.match(/^\/favorites\/([^\/]+)$/);
    if (favMatch && (method === "POST" || method === "DELETE")) {
      const prodId = favMatch[1];
      const favIdx = db.favorites.findIndex(f => f.user_id === currentUser.id && f.product_id === prodId);

      if (method === "DELETE") {
        if (favIdx !== -1) {
          db.favorites.splice(favIdx, 1);
          saveDb(db);
        }
        res.end(JSON.stringify({ message: "Favorito removido" }));
        return;
      }

      if (method === "POST") {
        if (favIdx === -1) {
          db.favorites.push({ user_id: currentUser.id, product_id: prodId });
          saveDb(db);
        }
        res.end(JSON.stringify({ message: "Favorito adicionado" }));
        return;
      }
    }

    // ── Endpoint: /api/orders ──
    if (subpath === "/orders" && method === "GET") {
      const list = db.orders.filter(o => o.user_id === currentUser.id);
      res.end(JSON.stringify({ data: list }));
      return;
    }

    if (subpath === "/orders" && method === "POST") {
      const body = await getJsonBody(req);
      const { items, subtotal, shipping_cost, discount, total, payment_method, shipping_address } = body;

      const orderNum = 1000 + db.orders.length + 1;
      const today = new Date();
      const formattedDate = today.toLocaleDateString("pt-BR");

      // Criar itens
      const orderItems = (items || []).map(i => {
        // Reduzir estoque
        const prodIdx = db.products.findIndex(p => p.id === i.product_id);
        if (prodIdx !== -1) {
          db.products[prodIdx].stock = Math.max(0, db.products[prodIdx].stock - i.quantity);
        }
        return {
          product_name: i.name || "Produto",
          product_sku: i.sku || "SKU",
          quantity: i.quantity,
          unit_price: parseFloat(i.price).toFixed(2),
          total_price: (parseFloat(i.price) * i.quantity).toFixed(2),
          image: i.image || ""
        };
      });

      const newOrder = {
        id: "order-" + Math.random().toString(36).substr(2, 9),
        order_number: orderNum,
        user_id: currentUser.id,
        status: "pending_payment",
        status_label: "Aguardando Pagamento",
        subtotal: parseFloat(subtotal || total).toFixed(2),
        shipping_cost: parseFloat(shipping_cost || 0).toFixed(2),
        discount: parseFloat(discount || 0).toFixed(2),
        total: parseFloat(total).toFixed(2),
        payment_label: payment_method || "PIX",
        shipping_name: currentUser.name,
        shipping_street: shipping_address.street || body.customerAddress || "",
        shipping_number: shipping_address.number || body.customerNumber || "",
        shipping_complement: shipping_address.complement || body.customerComplement || "",
        shipping_neighborhood: shipping_address.neighborhood || body.customerNeighborhood || "",
        shipping_city: shipping_address.city || body.customerCity || "",
        shipping_state: shipping_address.state || body.customerState || "",
        shipping_zip: shipping_address.zip_code || body.checkoutCep || "",
        formatted_date: formattedDate,
        status_history: [
          {
            status: "pending_payment",
            status_label: "Pedido Recebido",
            date: formattedDate,
            time: today.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          }
        ],
        items: orderItems
      };

      db.orders.push(newOrder);
      saveDb(db);
      res.end(JSON.stringify({ message: "Pedido criado com sucesso", order_id: newOrder.id, order_number: orderNum }));
      return;
    }

    // ── Endpoint: /api/orders/:id ──
    const ordMatch = subpath.match(/^\/orders\/([^\/]+)$/);
    if (ordMatch && method === "GET") {
      const orderId = ordMatch[1];
      const order = db.orders.find(o => o.id === orderId && (o.user_id === currentUser.id || currentUser.role === "admin"));
      if (!order) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Pedido não encontrado" }));
        return;
      }
      res.end(JSON.stringify(order));
      return;
    }

    // ── ENDPOINTS ADMINISTRATIVOS ──
    if (currentUser.role !== "admin") {
      res.writeHead(403);
      res.end(JSON.stringify({ error: "Não autorizado" }));
      return;
    }

    // ── Endpoint: /api/admin/dashboard ──
    if (subpath === "/admin/dashboard" && method === "GET") {
      const totalRev = db.orders.filter(o => o.status !== "cancelled").reduce((acc, curr) => acc + parseFloat(curr.total), 0);
      const lowStock = db.products.filter(p => p.stock <= 5);

      const recent = db.orders.slice(-5).reverse();

      const stats = {
        total_revenue: totalRev,
        total_orders: db.orders.length,
        total_customers: db.users.filter(u => u.role === "customer").length,
        total_products: db.products.length,
        monthly_revenue: totalRev * 0.4, // Simulado
        monthly_orders: Math.ceil(db.orders.length * 0.4), // Simulado
        recent_orders: recent,
        low_stock: lowStock,
        monthly_chart: [
          { month: "2026-03", revenue: (totalRev * 0.2).toFixed(2) },
          { month: "2026-04", revenue: (totalRev * 0.3).toFixed(2) },
          { month: "2026-05", revenue: (totalRev * 0.1).toFixed(2) },
          { month: "2026-06", revenue: (totalRev * 0.4).toFixed(2) }
        ]
      };
      res.end(JSON.stringify(stats));
      return;
    }

    // ── Endpoint: /api/admin/orders ──
    if (subpath === "/admin/orders" && method === "GET") {
      const search = parsedUrl.searchParams.get("search") || "";
      const status = parsedUrl.searchParams.get("status") || "";
      let list = db.orders;

      if (search) {
        list = list.filter(o => o.shipping_name.toLowerCase().includes(search.toLowerCase()) || String(o.order_number).includes(search));
      }
      if (status) {
        list = list.filter(o => o.status === status);
      }

      res.end(JSON.stringify({
        data: list,
        pagination: { page: 1, total_pages: 1, total_items: list.length }
      }));
      return;
    }

    // ── Endpoint: /api/admin/orders/:id/status (PUT) ──
    const ordStatusMatch = subpath.match(/^\/admin\/orders\/([^\/]+)\/status$/);
    if (ordStatusMatch && method === "PUT") {
      const orderId = ordStatusMatch[1];
      const body = await getJsonBody(req);
      const { status, notes } = body;

      const orderIdx = db.orders.findIndex(o => o.id === orderId);
      if (orderIdx === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Pedido não encontrado" }));
        return;
      }

      const label = statusLabels[status] || status;
      const today = new Date();
      
      db.orders[orderIdx].status = status;
      db.orders[orderIdx].status_label = label;
      db.orders[orderIdx].status_history.push({
        status,
        status_label: label,
        date: today.toLocaleDateString("pt-BR"),
        time: today.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        changed_by_name: currentUser.name,
        notes: notes || null
      });

      saveDb(db);
      res.end(JSON.stringify({ message: "Status atualizado com sucesso" }));
      return;
    }

    // ── Endpoint: /api/admin/customers ──
    if (subpath === "/admin/customers" && method === "GET") {
      const list = db.users.filter(u => u.role === "customer");
      res.end(JSON.stringify({
        data: list,
        pagination: { page: 1, total_pages: 1, total_items: list.length }
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Endpoint não encontrado" }));
    return;
  }

  // ── Servir Arquivos Estáticos ──
  const relativePath = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Arquivo não encontrado");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`Essenza local: http://localhost:${port}`);
  console.log(`Produção: https://essenzamodaeperfumaria.com/`);
});
