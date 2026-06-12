<?php
/**
 * ESSENZA — API de Produtos
 * CRUD público e admin de produtos
 */

$subPath = '/' . implode('/', array_slice($segments, 1));
$pdo = Database::getInstance();

switch (true) {

    // ── GET /api/products ── (público)
    case $method === 'GET' && ($subPath === '/' || $subPath === ''):
        $category = $_GET['category'] ?? null;
        $search   = $_GET['search'] ?? null;
        $page     = (int) ($_GET['page'] ?? 1);
        $perPage  = (int) ($_GET['per_page'] ?? 50);

        $where = ['p.is_active = 1'];
        $params = [];

        if ($category) {
            $where[] = '(c.name = ? OR c.slug = ?)';
            $params[] = $category;
            $params[] = $category;
        }

        if ($search) {
            $where[] = '(p.name LIKE ? OR p.description LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $whereClause = implode(' AND ', $where);

        // Contagem total
        $countSql = "SELECT COUNT(*) as total FROM products p
                     LEFT JOIN categories c ON p.category_id = c.id
                     WHERE $whereClause";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = $stmt->fetch()['total'];

        $pagination = paginate($page, $perPage, $total);

        // Buscar produtos
        $sql = "SELECT p.*, c.name as category, c.slug as category_slug,
                       b.name as brand_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE $whereClause
                ORDER BY p.created_at DESC
                LIMIT {$pagination['per_page']} OFFSET {$pagination['offset']}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        jsonResponse([
            'data'       => $products,
            'pagination' => $pagination,
        ]);
        break;

    // ── GET /api/products/{id} ── (público)
    case $method === 'GET' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
        $productId = $m[1];

        $stmt = $pdo->prepare(
            'SELECT p.*, c.name as category, c.slug as category_slug, b.name as brand_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN brands b ON p.brand_id = b.id
             WHERE p.id = ? LIMIT 1'
        );
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product) {
            jsonError('Produto não encontrado', 404);
        }

        // Buscar imagens adicionais
        $stmt = $pdo->prepare(
            'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order'
        );
        $stmt->execute([$productId]);
        $product['images'] = $stmt->fetchAll();

        // Buscar avaliações aprovadas
        $stmt = $pdo->prepare(
            'SELECT r.*, u.name as user_name
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.product_id = ? AND r.is_approved = 1
             ORDER BY r.created_at DESC LIMIT 10'
        );
        $stmt->execute([$productId]);
        $product['reviews'] = $stmt->fetchAll();

        jsonResponse($product);
        break;

    // ── GET /api/products/categories ── (público)
    case $method === 'GET' && $subPath === '/categories':
        $stmt = $pdo->query(
            'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
             FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order'
        );
        jsonResponse($stmt->fetchAll());
        break;

    // ── POST /api/products ── (admin)
    case $method === 'POST' && $subPath === '/':
        $admin = Auth::requireAdmin();
        $data = getJsonBody();
        $missing = validateRequired($data, ['name', 'price', 'description']);

        if ($missing) {
            jsonError('Campos obrigatórios: ' . implode(', ', $missing));
        }

        $id = $data['id'] ?? generateUUID();

        $stmt = $pdo->prepare(
            'INSERT INTO products (id, sku, name, slug, category_id, brand_id, price, compare_price, weight, stock, image, description, short_description, is_new, is_best_seller)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $data['sku'] ?? null,
            $data['name'],
            $data['slug'] ?? null,
            $data['category_id'] ?? null,
            $data['brand_id'] ?? null,
            $data['price'],
            $data['compare_price'] ?? null,
            $data['weight'] ?? 0,
            $data['stock'] ?? 0,
            $data['image'] ?? null,
            $data['description'],
            $data['short_description'] ?? null,
            $data['is_new'] ?? false,
            $data['is_best_seller'] ?? false,
        ]);

        // Registrar movimentação de estoque
        if (($data['stock'] ?? 0) > 0) {
            $stmt = $pdo->prepare(
                'INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
                 VALUES (?, "in", ?, "Estoque inicial", ?)'
            );
            $stmt->execute([$id, $data['stock'], $admin['id']]);
        }

        logAdminAction('create_product', 'product', $id, $data['name']);

        jsonResponse(['id' => $id, 'message' => 'Produto criado com sucesso'], 201);
        break;

    // ── PUT /api/products/{id} ── (admin)
    case $method === 'PUT' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
        $admin = Auth::requireAdmin();
        $productId = $m[1];
        $data = getJsonBody();

        // Verificar estoque anterior para movimentação
        $stmt = $pdo->prepare('SELECT stock, name FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        $oldProduct = $stmt->fetch();

        if (!$oldProduct) {
            jsonError('Produto não encontrado', 404);
        }

        $stmt = $pdo->prepare(
            'UPDATE products SET sku = ?, name = ?, slug = ?, category_id = ?, brand_id = ?,
             price = ?, compare_price = ?, weight = ?, stock = ?, image = ?, description = ?,
             short_description = ?, is_new = ?, is_best_seller = ?, is_active = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $data['sku'] ?? null,
            $data['name'],
            $data['slug'] ?? null,
            $data['category_id'] ?? null,
            $data['brand_id'] ?? null,
            $data['price'],
            $data['compare_price'] ?? null,
            $data['weight'] ?? 0,
            $data['stock'] ?? 0,
            $data['image'] ?? null,
            $data['description'],
            $data['short_description'] ?? null,
            $data['is_new'] ?? false,
            $data['is_best_seller'] ?? false,
            $data['is_active'] ?? true,
            $productId,
        ]);

        // Registrar movimentação de estoque se mudou
        $newStock = (int) ($data['stock'] ?? 0);
        $oldStock = (int) $oldProduct['stock'];
        if ($newStock !== $oldStock) {
            $diff = $newStock - $oldStock;
            $type = $diff > 0 ? 'in' : 'out';
            $stmt = $pdo->prepare(
                'INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
                 VALUES (?, ?, ?, "Ajuste manual via admin", ?)'
            );
            $stmt->execute([$productId, $type, abs($diff), $admin['id']]);
        }

        logAdminAction('update_product', 'product', $productId, $data['name']);

        jsonResponse(['message' => 'Produto atualizado com sucesso']);
        break;

    // ── DELETE /api/products/{id} ── (admin)
    case $method === 'DELETE' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
        $admin = Auth::requireAdmin();
        $productId = $m[1];

        // Soft delete — apenas desativar
        $stmt = $pdo->prepare('UPDATE products SET is_active = 0 WHERE id = ?');
        $stmt->execute([$productId]);

        if ($stmt->rowCount() === 0) {
            jsonError('Produto não encontrado', 404);
        }

        logAdminAction('delete_product', 'product', $productId);

        jsonResponse(['message' => 'Produto desativado com sucesso']);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
