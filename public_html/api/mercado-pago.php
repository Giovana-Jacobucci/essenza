<?php
/** Notificações de pagamento do Checkout Pro. */
require_once __DIR__ . '/../includes/mercado-pago.php';

if ($method !== 'POST' || $path !== '/mercado-pago/webhook') jsonError('Endpoint não encontrado', 404);

$body = getJsonBody();
$eventType = $body['type'] ?? ($_GET['type'] ?? '');
if ($eventType !== 'payment') jsonResponse(['received' => true]);

// O Mercado Pago envia data.id como parâmetro de consulta. PHP também o expõe como data_id.
$dataId = (string) ($_GET['data_id'] ?? $_GET['data.id'] ?? $body['data']['id'] ?? '');
if (!ctype_digit($dataId) || !mercadoPagoWebhookValid($dataId)) jsonError('Assinatura inválida', 401);

try {
    // O corpo da notificação não determina status nem valor: buscamos ambos na API autenticada.
    $remote = mercadoPagoRequest('GET', '/v1/payments/' . rawurlencode($dataId));
    if ((string) ($remote['collector_id'] ?? '') !== mercadoPagoCollectorId()) {
        jsonError('Conta recebedora não corresponde à configurada', 400);
    }
    $orderId = (string) ($remote['external_reference'] ?? '');
    if (!preg_match('/^[a-f0-9-]{36}$/i', $orderId)) jsonResponse(['received' => true]);
    $pdo = Database::getInstance();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT o.id, o.total, o.status, p.id AS payment_id, p.status AS payment_status
        FROM orders o JOIN payments p ON p.order_id = o.id
        WHERE o.id = ? AND p.method = "mercado_pago" FOR UPDATE');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order || abs((float) $order['total'] - (float) ($remote['transaction_amount'] ?? -1)) > 0.01 ||
        ($remote['currency_id'] ?? '') !== 'BRL') {
        $pdo->rollBack();
        jsonError('Pagamento não corresponde ao pedido', 400);
    }

    $status = (string) ($remote['status'] ?? '');
    if ($status === 'approved' && $order['payment_status'] !== 'approved') {
        $pdo->prepare('UPDATE payments SET status = "approved", transaction_id = ?, paid_at = NOW() WHERE id = ?')
            ->execute([$dataId, $order['payment_id']]);
        if ($order['status'] === 'pending_payment') {
            $pdo->prepare('UPDATE orders SET status = "paid" WHERE id = ?')->execute([$orderId]);
            $pdo->prepare('INSERT INTO order_status_history (order_id, status, notes, changed_by)
                VALUES (?, "paid", "Pagamento confirmado pelo Mercado Pago", NULL)')->execute([$orderId]);
        }
    } elseif ($status === 'refunded' || $status === 'charged_back') {
        $pdo->prepare('UPDATE payments SET status = "refunded", transaction_id = ? WHERE id = ?')
            ->execute([$dataId, $order['payment_id']]);
        // Cancelamento e reposição de estoque exigem tratamento operacional separado.
    } elseif (in_array($status, ['rejected', 'cancelled'], true) && $order['payment_status'] !== 'approved') {
        $pdo->prepare('UPDATE payments SET status = "rejected", transaction_id = ? WHERE id = ?')
            ->execute([$dataId, $order['payment_id']]);
    }
    $pdo->commit();
    jsonResponse(['received' => true]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('Mercado Pago webhook: ' . $e->getMessage());
    jsonError('Falha ao processar notificação', 503);
}
