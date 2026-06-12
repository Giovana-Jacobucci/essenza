<?php
/**
 * ESSENZA — Middleware de Autenticação
 * Controle de acesso por sessão e role
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/security.php';

class Auth {

    /**
     * Retorna o usuário logado ou null
     */
    public static function getCurrentUser(): ?array {
        Security::startSession();

        if (empty($_SESSION['user_id'])) {
            return null;
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT id, name, email, cpf, phone, birth_date, role, avatar_url, is_active, created_at
             FROM users WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Verifica se o usuário está autenticado.
     * Retorna os dados do usuário ou envia 401.
     */
    public static function requireAuth(): array {
        $user = self::getCurrentUser();

        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Autenticação necessária']);
            exit;
        }

        return $user;
    }

    /**
     * Verifica se o usuário é administrador.
     * Retorna os dados do usuário ou envia 403.
     */
    public static function requireAdmin(): array {
        $user = self::requireAuth();

        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Acesso restrito a administradores']);
            exit;
        }

        return $user;
    }

    /**
     * Verifica se o usuário está logado (sem bloquear)
     */
    public static function isLoggedIn(): bool {
        Security::startSession();
        return !empty($_SESSION['user_id']);
    }

    /**
     * Efetua login: valida credenciais e cria sessão
     */
    public static function login(string $identifier, string $password): ?array {
        $pdo = Database::getInstance();

        // Permitir login por e-mail ou CPF
        $stmt = $pdo->prepare(
            'SELECT id, name, email, cpf, phone, birth_date, role, password, avatar_url, is_active
             FROM users WHERE (email = ? OR cpf = ?) LIMIT 1'
        );
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            return null;
        }

        if (!$user['is_active']) {
            return null;
        }

        // Remover hash da resposta
        unset($user['password']);

        // Criar sessão
        Security::startSession();
        Security::regenerateSession();
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        // Atualizar último login
        $stmt = $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = ?');
        $stmt->execute([$user['id']]);

        return $user;
    }

    /**
     * Efetua logout: destrói a sessão
     */
    public static function logout(): void {
        Security::startSession();
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
    }

    /**
     * Registra um novo usuário
     */
    public static function register(array $data): array {
        $pdo = Database::getInstance();

        // Verificar e-mail único
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$data['email']]);
        if ($stmt->fetch()) {
            throw new \RuntimeException('Este e-mail já está cadastrado');
        }

        // Verificar CPF único
        $stmt = $pdo->prepare('SELECT id FROM users WHERE cpf = ? LIMIT 1');
        $stmt->execute([$data['cpf']]);
        if ($stmt->fetch()) {
            throw new \RuntimeException('Este CPF já está cadastrado');
        }

        $id = self::generateUUID();
        $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);

        $stmt = $pdo->prepare(
            'INSERT INTO users (id, name, email, cpf, phone, birth_date, password, role)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $data['name'],
            $data['email'],
            $data['cpf'],
            $data['phone'] ?? null,
            $data['birth_date'] ?? null,
            $hashedPassword,
            $data['role'] ?? 'customer',
        ]);

        return [
            'id'    => $id,
            'name'  => $data['name'],
            'email' => $data['email'],
            'cpf'   => $data['cpf'],
            'role'  => $data['role'] ?? 'customer',
        ];
    }

    /**
     * Gera um UUID v4
     */
    public static function generateUUID(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
