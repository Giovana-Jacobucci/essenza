<?php
/**
 * ESSENZA — API de Endereços
 * CRUD de endereços do usuário autenticado
 */

$user = Auth::requireAuth();
$subPath = '/' . implode('/', array_slice($segments, 1));
$pdo = Database::getInstance();

switch (true) {

    // ── GET /api/addresses ──
    case $method === 'GET' && $subPath === '/':
        $stmt = $pdo->prepare(
            'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC'
        );
        $stmt->execute([$user['id']]);
        jsonResponse($stmt->fetchAll());
        break;

    // ── POST /api/addresses ──
    case $method === 'POST' && $subPath === '/':
        $data = getJsonBody();
        $missing = validateRequired($data, ['recipient', 'street', 'number', 'neighborhood', 'city', 'state', 'zip_code']);

        if ($missing) {
            jsonError('Campos obrigatórios: ' . implode(', ', $missing));
        }

        $id = generateUUID();
        $isDefault = !empty($data['is_default']);

        // Se é default, remover default anterior
        if ($isDefault) {
            $stmt = $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?');
            $stmt->execute([$user['id']]);
        }

        // Se é o primeiro endereço, marcar como default
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        if ($stmt->fetch()['count'] === 0) {
            $isDefault = true;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO addresses (id, user_id, label, recipient, street, number, complement, neighborhood, city, state, zip_code, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $user['id'],
            $data['label'] ?? 'Casa',
            $data['recipient'],
            $data['street'],
            $data['number'],
            $data['complement'] ?? null,
            $data['neighborhood'],
            $data['city'],
            strtoupper($data['state']),
            $data['zip_code'],
            $isDefault ? 1 : 0,
        ]);

        jsonResponse(['id' => $id, 'message' => 'Endereço adicionado com sucesso'], 201);
        break;

    // ── PUT /api/addresses/{id} ──
    case $method === 'PUT' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
        $addressId = $m[1];
        $data = getJsonBody();

        // Verificar que o endereço pertence ao usuário
        $stmt = $pdo->prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?');
        $stmt->execute([$addressId, $user['id']]);
        if (!$stmt->fetch()) {
            jsonError('Endereço não encontrado', 404);
        }

        $isDefault = !empty($data['is_default']);
        if ($isDefault) {
            $stmt = $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?');
            $stmt->execute([$user['id']]);
        }

        $stmt = $pdo->prepare(
            'UPDATE addresses SET label = ?, recipient = ?, street = ?, number = ?, complement = ?,
             neighborhood = ?, city = ?, state = ?, zip_code = ?, is_default = ?
             WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([
            $data['label'] ?? 'Casa',
            $data['recipient'],
            $data['street'],
            $data['number'],
            $data['complement'] ?? null,
            $data['neighborhood'],
            $data['city'],
            strtoupper($data['state']),
            $data['zip_code'],
            $isDefault ? 1 : 0,
            $addressId,
            $user['id'],
        ]);

        jsonResponse(['message' => 'Endereço atualizado com sucesso']);
        break;

    // ── DELETE /api/addresses/{id} ──
    case $method === 'DELETE' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
        $addressId = $m[1];

        $stmt = $pdo->prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?');
        $stmt->execute([$addressId, $user['id']]);

        if ($stmt->rowCount() === 0) {
            jsonError('Endereço não encontrado', 404);
        }

        jsonResponse(['message' => 'Endereço excluído com sucesso']);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
