<?php
/**
 * ESSENZA — Configuração Central
 * Credenciais, constantes e configurações do sistema
 */

// Ambiente: 'production' ou 'development'
define('APP_ENV', 'production');

// ── Banco de dados ──
define('DB_HOST', 'localhost');
define('DB_NAME', 'u560112854_essenza_banco');
define('DB_USER', 'u560112854_essenza');
define('DB_PASS', 'Donadel@10');
define('DB_CHARSET', 'utf8mb4');

// ── Segurança ──
define('BCRYPT_COST', 12);
define('SESSION_LIFETIME', 1800);       // 30 minutos em segundos
define('SESSION_NAME', 'essenza_sid');
define('CSRF_TOKEN_NAME', 'csrf_token');
define('RATE_LIMIT_MAX_ATTEMPTS', 5);
define('RATE_LIMIT_WINDOW', 900);       // 15 minutos em segundos
define('RESET_TOKEN_EXPIRY', 3600);     // 1 hora em segundos

// ── Aplicação ──
define('SITE_NAME', 'Essenza');
define('SITE_URL', 'https://essenzamodaeperfumaria.com');
define('ADMIN_INITIAL_PASSWORD', '2026');
define('ITEMS_PER_PAGE', 20);
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB

// ── Paths ──
define('BASE_PATH', dirname(__DIR__));
define('INCLUDES_PATH', __DIR__);

// ── CORS — permitir acesso da mesma origem ──
define('ALLOWED_ORIGINS', [
    'https://essenzamodaeperfumaria.com',
    'http://localhost:5500',
    'http://localhost:8080',
]);
