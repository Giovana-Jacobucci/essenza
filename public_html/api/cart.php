<?php
/**
 * ESSENZA — API de Carrinho
 * Carrinho persistente no banco para usuários logados
 */

$subPath = '/' . implode('/', array_slice($segments, 1));
$pdo = Database::getInstance();

// Obter ou criar carrinho
function getOrCreateCart(PDO $pdo, ?string $userId): string {
    if ($userId) {
        $stmt = $pdo->prepare('SELECT id FROM cart WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $cart = $stmt->fetch();

        if ($cart) return $cart['id'];

        $cartId = generateUUID();
        $stmt = $pdo->prepare('INSERT INTO cart (id, user_id) VALUES (?, ?)');
        $stmt->execute([$cartId, $userId]);
        return $cartId;
    }

    // Carrinho por sessão para visitantes
    Security::startSession();
    $sessionId = session_id();

    $stmt = $pdo->prepare('SELECT id FROM cart WHERE session_id = ? LIMIT 1');
    $stmt->execute([$sessionId]);
    $cart = $stmt->fetch();

    if ($cart) return $cart['id'];

    $cartId = generateUUID();
    $stmt = $pdo->prepare('INSERT INTO cart (id, session_id) VALUES (?, ?)');
    $stmt->execute([$cartId, $sessionId]);
    return $cartId;
}

$user = Auth::getCurrentUser();
$userId = $user ? $user['id'] : null;

switch (true) {

    // ── GET /api/cart ──
    case $method === 'GET' && ($subPath === '/' || $subPath === ''):
        $cartId = getOrCreateCart($pdo, $userId);

        $stmt = $pdo->prepare(
            'SELECT ci.*, p.name, p.price, p.stock, p.image, p.weight,
                    c.name as category
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             LEFT JOIN categories cat ON p.category_id = cat.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE ci.cart_id = ?
             ORDER BY ci.created_at'
        );
        $stmt->execute([$cartId]);
        $items = $stmt->fetchAll();

        $subtotal = 0;
        $totalWeight = 0;
        foreach ($items as &$item) {
            $item['line_total'] = $item['price'] * $item['quantity'];
            $subtotal += $item['line_total'];
            $totalWeight += $item['weight'] * $item['quantity'];
        }

        jsonResponse([
            'cart_id'     => $cartId,
            'items'       => $items,
            'subtotal'    => $subtotal,
            'total_weight'=> $totalWeight,
            'count'       => count($items),
        ]);
        break;

    // ── POST /api/cart/add ──
    case $method === 'POST' && $subPath === '/add':
        $data = getJsonBody();
        $productId = $data['product_id'] ?? '';
        $quantity  = (int) ($data['quantity'] ?? 1);

        if (!$productId) {
            jsonError('product_id é obrigatório');
        }

        // Verificar produto e estoque
        $stmt = $pdo->prepare('SELECT id, stock, name FROM products WHERE id = ? AND is_active = 1');
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product) {
            jsonError('Produto não encontrado', 404);
        }

        $cartId = getOrCreateCart($pdo, $userId);

        // Verificar se já está no carrinho
        $stmt = $pdo->prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?');
        $stmt->execute([$cartId, $productId]);
        $existing = $stmt->fetch();

        $newQty = $existing ? $existing['quantity'] + $quantity : $quantity;
        if ($newQty > $product['stock']) {
            jsonError('Estoque insuficiente. Disponível: ' . $product['stock']);
        }

        if ($existing) {
            $stmt = $pdo->prepare('UPDATE cart_items SET quantity = ? WHERE id = ?');
            $stmt->execute([$newQty, $existing['id']]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)'
            );
            $stmt->execute([$cartId, $productId, $quantity]);
        }

        jsonResponse(['message' => "{$product['name']} adicionado ao carrinho"]);
        break;

    // ── PUT /api/cart/update ──
    case $method === 'PUT' && $subPath === '/update':
        $data = getJsonBody();
        $productId = $data['product_id'] ?? '';
        $quantity  = (int) ($data['quantity'] ?? 0);

        if (!$productId) {
            jsonError('product_id é obrigatório');
        }

        $cartId = getOrCreateCart($pdo, $userId);

        if ($quantity <= 0) {
            // Remover item
            $stmt = $pdo->prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?');
            $stmt->execute([$cartId, $productId]);
        } else {
            // Verificar estoque
            $stmt = $pdo->prepare('SELECT stock FROM products WHERE id = ?');
            $stmt->execute([$productId]);
            $product = $stmt->fetch();

            if ($product && $quantity > $product['stock']) {
                jsonError('Estoque insuficiente. Disponível: ' . $product['stock']);
            }

            $stmt = $pdo->prepare(
                'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?'
            );
            $stmt->execute([$quantity, $cartId, $productId]);
        }

        jsonResponse(['message' => 'Carrinho atualizado']);
        break;

    // ── DELETE /api/cart/remove/{product_id} ──
    case $method === 'DELETE' && preg_match('#^/remove/([a-f0-9-]{36})$#', $subPath, $m):
        $productId = $m[1];
        $cartId = getOrCreateCart($pdo, $userId);

        $stmt = $pdo->prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?');
        $stmt->execute([$cartId, $productId]);

        jsonResponse(['message' => 'Item removido do carrinho']);
        break;

    // ── POST /api/cart/merge ── (mescla carrinho de sessão com carrinho do usuário ao logar)
    case $method === 'POST' && $subPath === '/merge':
        if (!$userId) {
            jsonError('Autenticação necessária', 401);
        }

        Security::startSession();
        $sessionId = session_id();

        // Buscar carrinho da sessão
        $stmt = $pdo->prepare('SELECT id FROM cart WHERE session_id = ? LIMIT 1');
        $stmt->execute([$sessionId]);
        $sessionCart = $stmt->fetch();

        if (!$sessionCart) {
            jsonResponse(['message' => 'Nenhum carrinho de sessão para mesclar']);
        }

        $userCartId = getOrCreateCart($pdo, $userId);

        // Mover itens da sessão para o carrinho do usuário
        $stmt = $pdo->prepare('SELECT product_id, quantity FROM cart_items WHERE cart_id = ?');
        $stmt->execute([$sessionCart['id']]);
        $sessionItems = $stmt->fetchAll();

        foreach ($sessionItems as $item) {
            // Verificar se já existe no carrinho do usuário
            $stmt = $pdo->prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?');
            $stmt->execute([$userCartId, $item['product_id']]);
            $existing = $stmt->fetch();

            if ($existing) {
                $stmt = $pdo->prepare('UPDATE cart_items SET quantity = GREATEST(quantity, ?) WHERE id = ?');
                $stmt->execute([$item['quantity'], $existing['id']]);
            } else {
                $stmt = $pdo->prepare(
                    'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)'
                );
                $stmt->execute([$userCartId, $item['product_id'], $item['quantity']]);
            }
        }

        // Remover carrinho de sessão
        $stmt = $pdo->prepare('DELETE FROM cart WHERE id = ?');
        $stmt->execute([$sessionCart['id']]);

        jsonResponse(['message' => 'Carrinho mesclado com sucesso']);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
