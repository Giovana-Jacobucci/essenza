<?php
/**
 * ESSENZA — API de Autenticação
 * Login, registro, logout, recuperação de senha
 */

$subPath = '/' . implode('/', array_slice($segments, 1));

switch (true) {

    // ── POST /api/auth/register ──
    case $method === 'POST' && $subPath === '/register':
        $data = getJsonBody();
        $missing = validateRequired($data, ['name', 'email', 'cpf', 'password']);

        if ($missing) {
            jsonError('Campos obrigatórios: ' . implode(', ', $missing));
        }

        if (!validateEmail($data['email'])) {
            jsonError('E-mail inválido');
        }

        $data['cpf'] = cleanCpf($data['cpf']);
        if (!validateCpf($data['cpf'])) {
            jsonError('CPF inválido');
        }

        if (isset($data['phone']) && !empty($data['phone']) && !validatePhone($data['phone'])) {
            jsonError('Telefone inválido');
        }

        if (strlen($data['password']) < 6) {
            jsonError('A senha deve ter no mínimo 6 caracteres');
        }

        try {
            $user = Auth::register($data);

            // Auto-login após registro
            Auth::login($data['email'], $data['password']);

            $token = Security::generateCsrfToken();
            jsonResponse([
                'user'  => $user,
                'csrf_token' => $token,
                'message' => 'Cadastro realizado com sucesso'
            ], 201);
        } catch (\RuntimeException $e) {
            jsonError($e->getMessage(), 409);
        }
        break;

    // ── POST /api/auth/login ──
    case $method === 'POST' && $subPath === '/login':
        $data = getJsonBody();
        $identifier = $data['identifier'] ?? '';  // email ou CPF
        $password   = $data['password'] ?? '';

        if (!$identifier || !$password) {
            jsonError('Informe e-mail/CPF e senha');
        }

        // Rate limiting
        if (!Security::checkRateLimit('login')) {
            jsonError('Muitas tentativas. Aguarde 15 minutos.', 429);
        }

        // Limpar pontuação se for CPF
        if (preg_match('/^\d/', $identifier)) {
            $identifier = cleanCpf($identifier);
        }

        $user = Auth::login($identifier, $password);

        if (!$user) {
            Security::recordAttempt('login');
            jsonError('Credenciais inválidas', 401);
        }

        Security::resetRateLimit('login');
        $token = Security::generateCsrfToken();

        jsonResponse([
            'user'  => $user,
            'csrf_token' => $token,
            'message' => 'Login realizado com sucesso'
        ]);
        break;

    // ── POST /api/auth/logout ──
    case $method === 'POST' && $subPath === '/logout':
        Auth::logout();
        jsonResponse(['message' => 'Logout realizado com sucesso']);
        break;

    // ── GET /api/auth/me ──
    case $method === 'GET' && $subPath === '/me':
        $user = Auth::getCurrentUser();
        if (!$user) {
            jsonResponse(['user' => null]);
        }
        $token = Security::generateCsrfToken();
        jsonResponse(['user' => $user, 'csrf_token' => $token]);
        break;

    // ── POST /api/auth/forgot-password ──
    case $method === 'POST' && $subPath === '/forgot-password':
        $data = getJsonBody();
        $email = $data['email'] ?? '';

        if (!$email || !validateEmail($email)) {
            jsonError('Informe um e-mail válido');
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Sempre responder success (não revelar se e-mail existe)
        if ($user) {
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', time() + RESET_TOKEN_EXPIRY);

            $stmt = $pdo->prepare(
                'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
            );
            $stmt->execute([$token, $expires, $user['id']]);

            // TODO: Enviar e-mail com link de reset quando SMTP estiver configurado
            // O link seria: SITE_URL/reset-password?token=$token
        }

        jsonResponse(['message' => 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.']);
        break;

    // ── POST /api/auth/reset-password ──
    case $method === 'POST' && $subPath === '/reset-password':
        $data = getJsonBody();
        $token    = $data['token'] ?? '';
        $password = $data['password'] ?? '';

        if (!$token || !$password) {
            jsonError('Token e nova senha são obrigatórios');
        }

        if (strlen($password) < 6) {
            jsonError('A senha deve ter no mínimo 6 caracteres');
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1'
        );
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('Token inválido ou expirado', 400);
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $stmt = $pdo->prepare(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
        );
        $stmt->execute([$hashedPassword, $user['id']]);

        jsonResponse(['message' => 'Senha redefinida com sucesso']);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
