<?php
/**
 * ESSENZA — API de Usuários
 * Perfil do usuário autenticado
 */

$subPath = '/' . implode('/', array_slice($segments, 1));

switch (true) {

    // ── GET /api/users/profile ──
    case $method === 'GET' && $subPath === '/profile':
        $user = Auth::requireAuth();
        jsonResponse(['user' => $user]);
        break;

    // ── PUT /api/users/profile ──
    case $method === 'PUT' && $subPath === '/profile':
        $user = Auth::requireAuth();
        $data = getJsonBody();
        $pdo = Database::getInstance();

        $fields = [];
        $params = [];

        if (isset($data['name']) && trim($data['name']) !== '') {
            $fields[] = 'name = ?';
            $params[] = trim($data['name']);
        }

        if (isset($data['phone'])) {
            if (!empty($data['phone']) && !validatePhone($data['phone'])) {
                jsonError('Telefone inválido');
            }
            $fields[] = 'phone = ?';
            $params[] = $data['phone'];
        }

        if (isset($data['birth_date'])) {
            $fields[] = 'birth_date = ?';
            $params[] = $data['birth_date'];
        }

        if (isset($data['email']) && $data['email'] !== $user['email']) {
            if (!validateEmail($data['email'])) {
                jsonError('E-mail inválido');
            }
            // Verificar unicidade
            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
            $stmt->execute([$data['email'], $user['id']]);
            if ($stmt->fetch()) {
                jsonError('Este e-mail já está em uso', 409);
            }
            $fields[] = 'email = ?';
            $params[] = $data['email'];
        }

        if (empty($fields)) {
            jsonError('Nenhum campo para atualizar');
        }

        $params[] = $user['id'];
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Retornar dados atualizados
        $updatedUser = Auth::getCurrentUser();
        jsonResponse(['user' => $updatedUser, 'message' => 'Perfil atualizado com sucesso']);
        break;

    // ── PUT /api/users/password ──
    case $method === 'PUT' && $subPath === '/password':
        $user = Auth::requireAuth();
        $data = getJsonBody();
        $pdo = Database::getInstance();

        $missing = validateRequired($data, ['current_password', 'new_password']);
        if ($missing) {
            jsonError('Campos obrigatórios: ' . implode(', ', $missing));
        }

        if (strlen($data['new_password']) < 6) {
            jsonError('A nova senha deve ter no mínimo 6 caracteres');
        }

        // Verificar senha atual
        $stmt = $pdo->prepare('SELECT password FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();

        if (!password_verify($data['current_password'], $row['password'])) {
            jsonError('Senha atual incorreta', 401);
        }

        $newHash = password_hash($data['new_password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
        $stmt->execute([$newHash, $user['id']]);

        jsonResponse(['message' => 'Senha alterada com sucesso']);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
