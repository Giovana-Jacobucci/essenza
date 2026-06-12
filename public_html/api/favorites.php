<?php
/**
 * ESSENZA — API de Favoritos
 * Adicionar/remover/listar produtos favoritos
 */

$user = Auth::requireAuth();
$subPath = '/' . implode('/', array_slice($segments, 1));
$pdo = Database::getInstance();

switch (true) {

    // ── GET /api/favorites ──
    case $method === 'GET' && ($subPath === '/' || $subPath === ''):
        $stmt = $pdo->prepare(
            'SELECT p.*, c.name as category, f.created_at as favorited_at
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE f.user_id = ? AND p.is_active = 1
             ORDER BY f.created_at DESC'
        );
        $stmt->execute([$user['id']]);
        jsonResponse($stmt->fetchAll());
        break;

    // ── POST /api/favorites ── (adicionar)
    case $method === 'POST' && ($subPath === '/' || $subPath === ''):
        $data = getJsonBody();
        $productId = $data['product_id'] ?? '';

        if (!$productId) {
            jsonError('product_id é obrigatório');
        }

        // Verificar se produto existe
        $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ? AND is_active = 1');
        $stmt->execute([$productId]);
        if (!$stmt->fetch()) {
            jsonError('Produto não encontrado', 404);
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)'
            );
            $stmt->execute([$user['id'], $productId]);
            jsonResponse(['message' => 'Produto adicionado aos favoritos'], 201);
        } catch (\PDOException $e) {
            // Duplicate key — já é favorito
            jsonResponse(['message' => 'Produto já está nos favoritos']);
        }
        break;

    // ── DELETE /api/favorites/{product_id} ──
    case $method === 'DELETE' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
        $productId = $m[1];

        $stmt = $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?');
        $stmt->execute([$user['id'], $productId]);

        jsonResponse(['message' => 'Produto removido dos favoritos']);
        break;

    // ── GET /api/favorites/check/{product_id} ──
    case $method === 'GET' && preg_match('#^/check/([a-f0-9-]{36})$#', $subPath, $m):
        $productId = $m[1];

        $stmt = $pdo->prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?');
        $stmt->execute([$user['id'], $productId]);

        jsonResponse(['is_favorite' => (bool) $stmt->fetch()]);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
