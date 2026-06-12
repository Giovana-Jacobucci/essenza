<?php
/**
 * ESSENZA — Setup do Administrador Inicial
 *
 * IMPORTANTE: Execute este arquivo apenas UMA VEZ e depois DELETE-O do servidor.
 * Acesse: https://essenzamodaeperfumaria.com/setup-admin.php
 */

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/auth-middleware.php';

header('Content-Type: text/html; charset=utf-8');

echo '<style>body{font-family:Inter,sans-serif;max-width:600px;margin:60px auto;padding:20px;background:#EDEBE4;color:#111}
.box{background:#F5F2EB;border:1px solid #D5CABA;padding:30px;margin:20px 0}
.success{color:#2E7D5A;font-weight:700}.error{color:#8B2E4A;font-weight:700}
code{background:#E4DDD2;padding:2px 8px;font-size:0.9em}</style>';

echo '<h1>Essenza — Setup Inicial</h1>';

$pdo = Database::getInstance();

// Verificar se já existe admin
$stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
$stmt->execute();

if ($stmt->fetch()) {
    echo '<div class="box"><p class="error">⚠️ Já existe um administrador cadastrado.</p>';
    echo '<p>Se precisar criar outro, acesse o phpMyAdmin ou use o painel admin.</p>';
    echo '<p><strong>DELETE este arquivo do servidor agora!</strong></p></div>';
    exit;
}

try {
    $admin = Auth::register([
        'name'       => 'Admin Essenza',
        'email'      => 'admin@essenzamodaeperfumaria.com',
        'cpf'        => '00000000000',
        'phone'      => '',
        'birth_date' => null,
        'password'   => ADMIN_INITIAL_PASSWORD,
        'role'       => 'admin',
    ]);

    echo '<div class="box">';
    echo '<p class="success">✅ Administrador criado com sucesso!</p>';
    echo '<p><strong>Credenciais:</strong></p>';
    echo '<ul>';
    echo '<li>E-mail: <code>admin@essenzamodaeperfumaria.com</code></li>';
    echo '<li>Senha: <code>' . ADMIN_INITIAL_PASSWORD . '</code></li>';
    echo '</ul>';
    echo '<p>⚠️ <strong>Altere a senha imediatamente após o primeiro login!</strong></p>';
    echo '<p>🗑️ <strong>DELETE este arquivo do servidor agora!</strong></p>';
    echo '</div>';

} catch (\Exception $e) {
    echo '<div class="box"><p class="error">❌ Erro: ' . htmlspecialchars($e->getMessage()) . '</p></div>';
}
