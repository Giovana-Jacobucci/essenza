<?php
/**
 * ESSENZA — Módulo de Segurança
 * CSRF, Rate Limiting, Sanitização, Sessão
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

class Security {

    /**
     * Inicializa a sessão segura
     */
    public static function startSession(): void {
        if (session_status() === PHP_SESSION_ACTIVE) return;

        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_secure', APP_ENV === 'production' ? '1' : '0');
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.gc_maxlifetime', (string) SESSION_LIFETIME);

        session_name(SESSION_NAME);
        session_start();

        // Session timeout — destroi sessão após inatividade
        if (isset($_SESSION['last_activity'])) {
            if (time() - $_SESSION['last_activity'] > SESSION_LIFETIME) {
                session_unset();
                session_destroy();
                session_start();
            }
        }
        $_SESSION['last_activity'] = time();
    }

    /**
     * Regenera o ID da sessão (usar após login)
     */
    public static function regenerateSession(): void {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
    }

    /**
     * Gera um token CSRF e armazena na sessão
     */
    public static function generateCsrfToken(): string {
        $token = bin2hex(random_bytes(32));
        $_SESSION[CSRF_TOKEN_NAME] = $token;
        return $token;
    }

    /**
     * Valida o token CSRF recebido
     */
    public static function validateCsrfToken(?string $token): bool {
        if (empty($token) || empty($_SESSION[CSRF_TOKEN_NAME])) {
            return false;
        }
        return hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
    }

    /**
     * Verifica rate limit para uma ação/IP
     * Retorna true se dentro do limite, false se excedido
     */
    public static function checkRateLimit(string $action, ?string $ip = null): bool {
        $ip = $ip ?? self::getClientIp();
        $pdo = Database::getInstance();

        // Limpar tentativas expiradas
        $stmt = $pdo->prepare(
            'DELETE FROM rate_limits WHERE action = ? AND first_attempt < DATE_SUB(NOW(), INTERVAL ? SECOND)'
        );
        $stmt->execute([$action, RATE_LIMIT_WINDOW]);

        // Verificar tentativas atuais
        $stmt = $pdo->prepare(
            'SELECT attempts FROM rate_limits WHERE ip_address = ? AND action = ? LIMIT 1'
        );
        $stmt->execute([$ip, $action]);
        $row = $stmt->fetch();

        if ($row && $row['attempts'] >= RATE_LIMIT_MAX_ATTEMPTS) {
            return false; // Limite excedido
        }

        return true;
    }

    /**
     * Registra uma tentativa de ação
     */
    public static function recordAttempt(string $action, ?string $ip = null): void {
        $ip = $ip ?? self::getClientIp();
        $pdo = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT id, attempts FROM rate_limits WHERE ip_address = ? AND action = ? LIMIT 1'
        );
        $stmt->execute([$ip, $action]);
        $row = $stmt->fetch();

        if ($row) {
            $stmt = $pdo->prepare(
                'UPDATE rate_limits SET attempts = attempts + 1, last_attempt = NOW() WHERE id = ?'
            );
            $stmt->execute([$row['id']]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO rate_limits (ip_address, action) VALUES (?, ?)'
            );
            $stmt->execute([$ip, $action]);
        }
    }

    /**
     * Reseta o rate limit para um IP/ação (após login bem-sucedido)
     */
    public static function resetRateLimit(string $action, ?string $ip = null): void {
        $ip = $ip ?? self::getClientIp();
        $pdo = Database::getInstance();
        $stmt = $pdo->prepare('DELETE FROM rate_limits WHERE ip_address = ? AND action = ?');
        $stmt->execute([$ip, $action]);
    }

    /**
     * Sanitiza string para output (proteção XSS)
     */
    public static function sanitize(string $value): string {
        return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Sanitiza array de dados recursivamente
     */
    public static function sanitizeArray(array $data): array {
        $clean = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $clean[$key] = self::sanitizeArray($value);
            } elseif (is_string($value)) {
                $clean[$key] = self::sanitize($value);
            } else {
                $clean[$key] = $value;
            }
        }
        return $clean;
    }

    /**
     * Obtém o IP real do cliente
     */
    public static function getClientIp(): string {
        $headers = [
            'HTTP_CF_CONNECTING_IP',  // Cloudflare
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR',
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = explode(',', $_SERVER[$header])[0];
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return '0.0.0.0';
    }

    /**
     * Configura headers de segurança HTTP
     */
    public static function setSecurityHeaders(): void {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');

        if (APP_ENV === 'production') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }

    /**
     * Configura CORS headers
     */
    public static function setCorsHeaders(): void {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, ALLOWED_ORIGINS, true)) {
            header("Access-Control-Allow-Origin: $origin");
        } elseif (APP_ENV === 'development') {
            header('Access-Control-Allow-Origin: *');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Credentials: true');
    }
}
