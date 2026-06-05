-- ============================================================
-- ESSENZA - Database Schema
-- MySQL Database: u560112854_essenza_banco
-- ============================================================

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50) DEFAULT NULL,
    price DECIMAL(10, 2) NOT NULL,
    weight INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image TEXT,
    description TEXT NOT NULL,
    is_new BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para melhor performance
CREATE INDEX idx_category ON products(category);
CREATE INDEX idx_stock ON products(stock);
CREATE INDEX idx_created_at ON products(created_at);

-- Inserir produtos padrão (opcional - pode ser feito via admin)
INSERT INTO products (id, name, category, price, weight, stock, image, description, is_new, is_best_seller) VALUES
(UUID(), 'Essenza Floral 100ml', 'Perfumes', 189.90, 420, 12, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80', 'Perfume feminino floral com toque fresco e acabamento sofisticado.', TRUE, FALSE),
(UUID(), 'Vestido Midi Aurora', 'Vestidos', 229.90, 360, 8, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80', 'Vestido midi leve, elegante e confortável para diversas ocasiões.', FALSE, TRUE),
(UUID(), 'Cropped Siena', 'Blusas', 119.90, 220, 3, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80', 'Blusa cropped com caimento ajustado e textura canelada premium.', FALSE, FALSE),
(UUID(), 'Colar Dourado Luz', 'Acessórios', 69.90, 80, 20, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80', 'Acessório delicado para compor looks com brilho discreto.', FALSE, TRUE),
(UUID(), 'Calça Reta Milano', 'Calças', 259.90, 400, 6, 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80', 'Calça reta em tecido premium, perfeita para looks casuais e sociais.', TRUE, FALSE),
(UUID(), 'Noir Élégance 50ml', 'Perfumes', 299.90, 380, 5, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80', 'Fragrância amadeirada intensa com base de sândalo e baunilha.', FALSE, TRUE);
