<?php
// O CPF cadastrado é imutável. Inclui pedidos pendentes e cancelados no limite.
function firstPurchaseEligible(PDO $pdo, array $user): bool {
    $stmt = $pdo->prepare("SELECT 1 FROM orders o JOIN users u ON u.id = o.user_id
        WHERE REPLACE(REPLACE(REPLACE(u.cpf, '.', ''), '-', ''), ' ', '') = ? LIMIT 1");
    $stmt->execute([preg_replace('/\D/', '', $user['cpf'])]);
    return !$stmt->fetchColumn();
}

function shippingPrice(string $state, float $weight, bool $eligible): float {
    $rates = json_decode(file_get_contents(__DIR__ . '/shipping-rates.json'), true);
    if (!isset($rates[$state])) throw new RuntimeException('Estado de entrega inválido');
    return $eligible ? 0 : $rates[$state]['price'] + max(0, ceil(($weight - 500) / 500)) * 5.5;
}
