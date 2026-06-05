<?php
/**
 * ESSENZA - API de Produtos
 * Conecta ao MySQL e fornece endpoints CRUD para produtos
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configurações do banco de dados
$db_host = 'localhost';
$db_name = 'u560112854_essenza_banco';
$db_user = 'u560112854_essenza';
$db_pass = 'Donadel@10';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro de conexão com o banco de dados']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '/';

// Router simples
if ($path === '/' || $path === '/products') {
    if ($method === 'GET') {
        getProducts($pdo);
    } elseif ($method === 'POST') {
        createProduct($pdo);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
    }
} elseif (preg_match('#^/products/([a-f0-9-]{36})$#', $path, $matches)) {
    $id = $matches[1];
    if ($method === 'GET') {
        getProduct($pdo, $id);
    } elseif ($method === 'PUT') {
        updateProduct($pdo, $id);
    } elseif ($method === 'DELETE') {
        deleteProduct($pdo, $id);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint não encontrado']);
}

// Funções CRUD

function getProducts($pdo) {
    try {
        $stmt = $pdo->query('SELECT * FROM products ORDER BY created_at DESC');
        $products = $stmt->fetchAll();
        echo json_encode($products);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao buscar produtos']);
    }
}

function getProduct($pdo, $id) {
    try {
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            http_response_code(404);
            echo json_encode(['error' => 'Produto não encontrado']);
            return;
        }
        
        echo json_encode($product);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao buscar produto']);
    }
}

function createProduct($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Dados inválidos']);
        return;
    }
    
    $id = $data['id'] ?? generateUUID();
    
    try {
        $stmt = $pdo->prepare('
            INSERT INTO products (id, name, category, subcategory, price, weight, stock, image, description, is_new, is_best_seller)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $id,
            $data['name'],
            $data['category'],
            $data['subcategory'] ?? null,
            $data['price'],
            $data['weight'],
            $data['stock'],
            $data['image'] ?? null,
            $data['description'],
            $data['isNew'] ?? false,
            $data['isBestSeller'] ?? false
        ]);
        
        http_response_code(201);
        echo json_encode(['id' => $id, 'message' => 'Produto criado com sucesso']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar produto']);
    }
}

function updateProduct($pdo, $id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Dados inválidos']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare('
            UPDATE products 
            SET name = ?, category = ?, subcategory = ?, price = ?, weight = ?, stock = ?, 
                image = ?, description = ?, is_new = ?, is_best_seller = ?
            WHERE id = ?
        ');
        $stmt->execute([
            $data['name'],
            $data['category'],
            $data['subcategory'] ?? null,
            $data['price'],
            $data['weight'],
            $data['stock'],
            $data['image'] ?? null,
            $data['description'],
            $data['isNew'] ?? false,
            $data['isBestSeller'] ?? false,
            $id
        ]);
        
        echo json_encode(['message' => 'Produto atualizado com sucesso']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao atualizar produto']);
    }
}

function deleteProduct($pdo, $id) {
    try {
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Produto não encontrado']);
            return;
        }
        
        echo json_encode(['message' => 'Produto excluído com sucesso']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao excluir produto']);
    }
}

function generateUUID() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
