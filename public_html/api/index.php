<?php
/**
 * ESSENZA — API Router
 * Rota todas as requisições /api/* para os módulos corretos
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/security.php';
require_once __DIR__ . '/../includes/auth-middleware.php';
require_once __DIR__ . '/../includes/helpers.php';

// Inicializar sessão e segurança
Security::startSession();
Security::setCorsHeaders();
Security::setSecurityHeaders();

header('Content-Type: application/json; charset=utf-8');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Extrair path da requisição
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$basePath = '/api';

// Remover query string
$path = parse_url($requestUri, PHP_URL_PATH);

// Remover o prefixo /api
if (str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
}
$path = '/' . trim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];

// ── Roteamento ──
$segments = explode('/', trim($path, '/'));
$module = $segments[0] ?? '';

// Validar CSRF em métodos que alteram dados
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    // Pular validação CSRF para login e registro (são os primeiros requests)
    $skipCsrf = in_array($path, ['/auth/login', '/auth/register', '/auth/forgot-password']);

    if (!$skipCsrf) {
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        // Em desenvolvimento, relaxar CSRF para facilitar testes
        if (APP_ENV === 'production' && !Security::validateCsrfToken($csrfToken)) {
            jsonError('Token CSRF inválido', 403);
        }
    }
}

// Roteamento por módulo
switch ($module) {
    case 'auth':
        require __DIR__ . '/auth.php';
        break;

    case 'users':
        require __DIR__ . '/users.php';
        break;

    case 'addresses':
        require __DIR__ . '/addresses.php';
        break;

    case 'products':
        require __DIR__ . '/products.php';
        break;

    case 'orders':
        require __DIR__ . '/orders.php';
        break;

    case 'favorites':
        require __DIR__ . '/favorites.php';
        break;

    case 'cart':
        require __DIR__ . '/cart.php';
        break;

    case 'admin':
        require __DIR__ . '/admin.php';
        break;

    case 'csrf':
        // Endpoint para obter token CSRF
        if ($method === 'GET') {
            $token = Security::generateCsrfToken();
            jsonResponse(['token' => $token]);
        }
        jsonError('Método não permitido', 405);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
