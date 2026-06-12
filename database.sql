-- ============================================================
-- ESSENZA — E-commerce Database Schema
-- MySQL Database: YOUR_DATABASE_NAME
-- Versão: 2.0 — Sistema completo de e-commerce
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. USUÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          CHAR(36) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    cpf         VARCHAR(14) NOT NULL,
    phone       VARCHAR(20) DEFAULT NULL,
    birth_date  DATE DEFAULT NULL,
    password    VARCHAR(255) NOT NULL,  -- bcrypt hash
    role        ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url  TEXT DEFAULT NULL,
    reset_token VARCHAR(64) DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    last_login  DATETIME DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- ============================================================
-- 2. ENDEREÇOS
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
    id          CHAR(36) PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    label       VARCHAR(50) DEFAULT 'Casa',       -- Casa, Trabalho, etc.
    recipient   VARCHAR(255) NOT NULL,
    street      VARCHAR(255) NOT NULL,
    number      VARCHAR(20) NOT NULL,
    complement  VARCHAR(100) DEFAULT NULL,
    neighborhood VARCHAR(100) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    state       CHAR(2) NOT NULL,
    zip_code    VARCHAR(9) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ============================================================
-- 3. CATEGORIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    parent_id   INT DEFAULT NULL,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_category_slug (slug),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id)
        REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir categorias padrão
INSERT INTO categories (name, slug, sort_order) VALUES
('Perfumes',   'perfumes',   1),
('Vestidos',   'vestidos',   2),
('Blusas',     'blusas',     3),
('Calças',     'calcas',     4),
('Acessórios', 'acessorios', 5);

-- Subcategorias
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Feminino',        'perfumes-feminino',     (SELECT id FROM categories c WHERE c.slug='perfumes' LIMIT 1), 1),
('Masculino',       'perfumes-masculino',    (SELECT id FROM categories c WHERE c.slug='perfumes' LIMIT 1), 2),
('Unissex',         'perfumes-unissex',      (SELECT id FROM categories c WHERE c.slug='perfumes' LIMIT 1), 3),
('Vestidos Longos', 'vestidos-longos',       (SELECT id FROM categories c WHERE c.slug='vestidos' LIMIT 1), 1),
('Vestidos Curtos', 'vestidos-curtos',       (SELECT id FROM categories c WHERE c.slug='vestidos' LIMIT 1), 2),
('Vestidos Midi',   'vestidos-midi',         (SELECT id FROM categories c WHERE c.slug='vestidos' LIMIT 1), 3),
('Vestidos Florais','vestidos-florais',      (SELECT id FROM categories c WHERE c.slug='vestidos' LIMIT 1), 4),
('T-Shirts',        'blusas-tshirts',        (SELECT id FROM categories c WHERE c.slug='blusas' LIMIT 1), 1),
('Croppeds',        'blusas-croppeds',       (SELECT id FROM categories c WHERE c.slug='blusas' LIMIT 1), 2),
('Blusas Sociais',  'blusas-sociais',        (SELECT id FROM categories c WHERE c.slug='blusas' LIMIT 1), 3),
('Regatas',         'blusas-regatas',        (SELECT id FROM categories c WHERE c.slug='blusas' LIMIT 1), 4),
('Calça Jeans',     'calcas-jeans',          (SELECT id FROM categories c WHERE c.slug='calcas' LIMIT 1), 1),
('Calça Social',    'calcas-social',         (SELECT id FROM categories c WHERE c.slug='calcas' LIMIT 1), 2),
('Legging',         'calcas-legging',        (SELECT id FROM categories c WHERE c.slug='calcas' LIMIT 1), 3),
('Shorts',          'calcas-shorts',         (SELECT id FROM categories c WHERE c.slug='calcas' LIMIT 1), 4);

-- ============================================================
-- 4. MARCAS
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    logo_url    TEXT DEFAULT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_brand_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO brands (name, slug) VALUES ('Essenza', 'essenza');

-- ============================================================
-- 5. PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              CHAR(36) PRIMARY KEY,
    sku             VARCHAR(50) DEFAULT NULL,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) DEFAULT NULL,
    category_id     INT DEFAULT NULL,
    brand_id        INT DEFAULT NULL,
    price           DECIMAL(10, 2) NOT NULL,
    compare_price   DECIMAL(10, 2) DEFAULT NULL,   -- preço "de" riscado
    weight          INT NOT NULL DEFAULT 0,          -- gramas
    stock           INT NOT NULL DEFAULT 0,
    image           TEXT DEFAULT NULL,
    description     TEXT NOT NULL,
    short_description VARCHAR(500) DEFAULT NULL,
    is_new          BOOLEAN DEFAULT FALSE,
    is_best_seller  BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    meta_title      VARCHAR(255) DEFAULT NULL,
    meta_description VARCHAR(500) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id)
        REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_created ON products(created_at);

-- Inserir produtos padrão
INSERT INTO products (id, sku, name, slug, category_id, brand_id, price, weight, stock, image, description, is_new, is_best_seller) VALUES
(UUID(), 'ESS-PERF-001', 'Essenza Floral 100ml', 'essenza-floral-100ml',
 (SELECT id FROM categories c WHERE c.slug='perfumes' LIMIT 1),
 (SELECT id FROM brands b WHERE b.slug='essenza' LIMIT 1),
 189.90, 420, 12,
 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80',
 'Perfume feminino floral com toque fresco e acabamento sofisticado.', TRUE, FALSE),

(UUID(), 'ESS-VEST-001', 'Vestido Midi Aurora', 'vestido-midi-aurora',
 (SELECT id FROM categories c WHERE c.slug='vestidos' LIMIT 1),
 (SELECT id FROM brands b WHERE b.slug='essenza' LIMIT 1),
 229.90, 360, 8,
 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
 'Vestido midi leve, elegante e confortável para diversas ocasiões.', FALSE, TRUE),

(UUID(), 'ESS-BLUS-001', 'Cropped Siena', 'cropped-siena',
 (SELECT id FROM categories c WHERE c.slug='blusas' LIMIT 1),
 (SELECT id FROM brands b WHERE b.slug='essenza' LIMIT 1),
 119.90, 220, 3,
 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80',
 'Blusa cropped com caimento ajustado e textura canelada premium.', FALSE, FALSE),

(UUID(), 'ESS-ACES-001', 'Colar Dourado Luz', 'colar-dourado-luz',
 (SELECT id FROM categories c WHERE c.slug='acessorios' LIMIT 1),
 (SELECT id FROM brands b WHERE b.slug='essenza' LIMIT 1),
 69.90, 80, 20,
 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
 'Acessório delicado para compor looks com brilho discreto.', FALSE, TRUE),

(UUID(), 'ESS-CALC-001', 'Calça Reta Milano', 'calca-reta-milano',
 (SELECT id FROM categories c WHERE c.slug='calcas' LIMIT 1),
 (SELECT id FROM brands b WHERE b.slug='essenza' LIMIT 1),
 259.90, 400, 6,
 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
 'Calça reta em tecido premium, perfeita para looks casuais e sociais.', TRUE, FALSE),

(UUID(), 'ESS-PERF-002', 'Noir Élégance 50ml', 'noir-elegance-50ml',
 (SELECT id FROM categories c WHERE c.slug='perfumes' LIMIT 1),
 (SELECT id FROM brands b WHERE b.slug='essenza' LIMIT 1),
 299.90, 380, 5,
 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80',
 'Fragrância amadeirada intensa com base de sândalo e baunilha.', FALSE, TRUE);

-- ============================================================
-- 6. IMAGENS DE PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  CHAR(36) NOT NULL,
    url         TEXT NOT NULL,
    alt_text    VARCHAR(255) DEFAULT NULL,
    sort_order  INT DEFAULT 0,
    is_primary  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pimages_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pimages_product ON product_images(product_id);

-- ============================================================
-- 7. CARRINHO
-- ============================================================
CREATE TABLE IF NOT EXISTS cart (
    id          CHAR(36) PRIMARY KEY,
    user_id     CHAR(36) DEFAULT NULL,
    session_id  VARCHAR(128) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_cart_session ON cart(session_id);

-- ============================================================
-- 8. ITENS DO CARRINHO
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cart_id     CHAR(36) NOT NULL,
    product_id  CHAR(36) NOT NULL,
    quantity    INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_cart_product (cart_id, product_id),
    CONSTRAINT fk_citems_cart FOREIGN KEY (cart_id)
        REFERENCES cart(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_citems_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id              CHAR(36) PRIMARY KEY,
    order_number    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         CHAR(36) NOT NULL,
    status          ENUM(
        'pending_payment',
        'paid',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled'
    ) NOT NULL DEFAULT 'pending_payment',
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_cost   DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    coupon_id       INT DEFAULT NULL,
    -- Endereço de entrega (snapshot no momento do pedido)
    shipping_name   VARCHAR(255) NOT NULL,
    shipping_street VARCHAR(255) NOT NULL,
    shipping_number VARCHAR(20) NOT NULL,
    shipping_complement VARCHAR(100) DEFAULT NULL,
    shipping_neighborhood VARCHAR(100) NOT NULL,
    shipping_city   VARCHAR(100) NOT NULL,
    shipping_state  CHAR(2) NOT NULL,
    shipping_zip    VARCHAR(9) NOT NULL,
    shipping_estimate DATE DEFAULT NULL,
    tracking_code   VARCHAR(100) DEFAULT NULL,
    notes           TEXT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_number (order_number),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id)
        REFERENCES coupons(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- ============================================================
-- 10. ITENS DO PEDIDO
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    CHAR(36) NOT NULL,
    product_id  CHAR(36) NOT NULL,
    product_name VARCHAR(255) NOT NULL,    -- snapshot
    product_sku  VARCHAR(50) DEFAULT NULL,  -- snapshot
    quantity    INT NOT NULL DEFAULT 1,
    unit_price  DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_oitems_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_oitems_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_oitems_order ON order_items(order_id);

-- ============================================================
-- 11. HISTÓRICO DE STATUS DO PEDIDO
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    CHAR(36) NOT NULL,
    status      ENUM(
        'pending_payment',
        'paid',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled'
    ) NOT NULL,
    notes       VARCHAR(500) DEFAULT NULL,
    changed_by  CHAR(36) DEFAULT NULL,     -- user_id do admin que alterou
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_osh_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_osh_user FOREIGN KEY (changed_by)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_osh_order ON order_status_history(order_id);

-- ============================================================
-- 12. PAGAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              CHAR(36) PRIMARY KEY,
    order_id        CHAR(36) NOT NULL,
    method          ENUM('pix','credit_card','boleto','debit_card') NOT NULL,
    status          ENUM('pending','approved','rejected','refunded') NOT NULL DEFAULT 'pending',
    amount          DECIMAL(10,2) NOT NULL,
    transaction_id  VARCHAR(255) DEFAULT NULL,
    gateway_response TEXT DEFAULT NULL,
    paid_at         DATETIME DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- 13. FAVORITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    product_id  CHAR(36) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_fav_user_product (user_id, product_id),
    CONSTRAINT fk_fav_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fav_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. CUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50) NOT NULL,
    type            ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    value           DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2) DEFAULT NULL,
    max_uses        INT DEFAULT NULL,
    used_count      INT NOT NULL DEFAULT 0,
    starts_at       DATETIME DEFAULT NULL,
    expires_at      DATETIME DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. AVALIAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    product_id  CHAR(36) NOT NULL,
    rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(255) DEFAULT NULL,
    comment     TEXT DEFAULT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_review_user_product (user_id, product_id),
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reviews_product ON reviews(product_id);

-- ============================================================
-- 16. MOVIMENTAÇÃO DE ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  CHAR(36) NOT NULL,
    type        ENUM('in','out','adjustment') NOT NULL,
    quantity    INT NOT NULL,
    reason      VARCHAR(255) DEFAULT NULL,
    reference_id CHAR(36) DEFAULT NULL,    -- order_id se saída por venda
    created_by  CHAR(36) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sm_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sm_user FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sm_product ON stock_movements(product_id);

-- ============================================================
-- 17. LOGS ADMINISTRATIVOS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     CHAR(36) DEFAULT NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,   -- 'order', 'product', 'user', etc.
    entity_id   VARCHAR(36) DEFAULT NULL,
    details     TEXT DEFAULT NULL,
    ip_address  VARCHAR(45) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alog_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_alog_user ON admin_logs(user_id);
CREATE INDEX idx_alog_action ON admin_logs(action);
CREATE INDEX idx_alog_created ON admin_logs(created_at);

-- ============================================================
-- 18. CONFIGURAÇÕES DO SITE
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key   VARCHAR(100) PRIMARY KEY,
    setting_value TEXT DEFAULT NULL,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configurações padrão
INSERT INTO site_settings (setting_key, setting_value) VALUES
('site_name',          'Essenza'),
('site_tagline',       'Moda Feminina & Perfumaria'),
('whatsapp_number',    '5500000000000'),
('freeship_min',       '399'),
('admin_email',        'contato@essenzamodaeperfumaria.com'),
('instagram_url',      ''),
('pinterest_url',      ''),
('store_address',      ''),
('pix_key',            ''),
('order_prefix',       'ESS');

-- ============================================================
-- 19. BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    subtitle    VARCHAR(500) DEFAULT NULL,
    image_url   TEXT NOT NULL,
    link_url    VARCHAR(500) DEFAULT NULL,
    position    ENUM('hero','promo_bar','category') NOT NULL DEFAULT 'hero',
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at   DATETIME DEFAULT NULL,
    expires_at  DATETIME DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. NEWSLETTER
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    name        VARCHAR(255) DEFAULT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME DEFAULT NULL,
    UNIQUE KEY uk_newsletter_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. RATE LIMITING (para segurança de login)
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    ip_address  VARCHAR(45) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    attempts    INT NOT NULL DEFAULT 1,
    first_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rl_ip_action (ip_address, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
