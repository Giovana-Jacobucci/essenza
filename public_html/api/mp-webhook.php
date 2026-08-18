<?php
/**
 * ESSENZA — Webhook do Mercado Pago
 * Recebe notificações assíncronas do Mercado Pago e atualiza os pedidos
 */

// Obter ID do recurso e tópico
$paymentId = null;

// 1. Tentar ler do corpo JSON da requisição (padrão do webhook novo)
$jsonInput = file_get_contents('php://input');
$payload = json_decode($jsonInput, true);

if (isset($payload['data']['id'])) {
    $paymentId = $payload['data']['id'];
} elseif (isset($payload['id'])) {
    $paymentId = $payload['id'];
}

// 2. Tentar ler de parâmetros de URL (padrão antigo ou IPN)
if (!$paymentId && isset($_GET['data_id'])) {
    $paymentId = $_GET['data_id'];
}
if (!$paymentId && isset($_GET['id'])) {
    $paymentId = $_GET['id'];
}

if (!$paymentId) {
    // Retorna 200 OK para o Mercado Pago não reenviar
    http_response_code(200);
    echo json_encode(['message' => 'Nenhum ID de transação fornecido']);
    exit;
}

// 3. Consultar a API oficial do Mercado Pago para evitar fraudes (Content Spoofing)
$url = "https://api.mercadopago.com/v1/payments/" . $paymentId;
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . MP_ACCESS_TOKEN
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(200);
    echo json_encode(['message' => 'Não foi possível validar a transação no Mercado Pago']);
    exit;
}

$paymentData = json_decode($response, true);
$status = $paymentData['status'] ?? ''; // approved, pending, in_process, rejected, cancelled, refunded
$orderId = $paymentData['external_reference'] ?? ''; // Nosso ID ou UUID do pedido

$pdo = Database::getInstance();

// 4. Buscar pedido correspondente
$stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) {
    // Tentar localizar pelo order_number caso o UUID tenha sido salvo como número na API
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
}

if ($order) {
    $newOrderStatus = null;
    $newPaymentStatus = 'pending';

    switch ($status) {
        case 'approved':
            $newOrderStatus = 'paid';
            $newPaymentStatus = 'approved';
            break;
        case 'rejected':
        case 'cancelled':
            $newOrderStatus = 'cancelled';
            $newPaymentStatus = 'rejected';
            break;
        case 'refunded':
            $newOrderStatus = 'cancelled';
            $newPaymentStatus = 'refunded';
            break;
    }

    if ($newOrderStatus) {
        $pdo->beginTransaction();
        try {
            // Atualizar o pagamento
            $stmt = $pdo->prepare("
                UPDATE payments 
                SET status = ?, transaction_id = ?, gateway_response = ?, paid_at = ? 
                WHERE order_id = ?
            ");
            $paidAt = ($status === 'approved') ? date('Y-m-d H:i:s') : null;
            $stmt->execute([
                $newPaymentStatus,
                $paymentId,
                $response,
                $paidAt,
                $order['id']
            ]);

            // Atualizar o pedido se houver mudança de status
            if ($order['status'] !== $newOrderStatus) {
                $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->execute([$newOrderStatus, $order['id']]);

                // Adicionar histórico
                $stmt = $pdo->prepare("
                    INSERT INTO order_status_history (order_id, status, notes, changed_by) 
                    VALUES (?, ?, ?, NULL)
                ");
                $notes = "Atualização automática de pagamento Mercado Pago. ID MP: {$paymentId}. Status: {$status}";
                $stmt->execute([$order['id'], $newOrderStatus, $notes]);
            }

            $pdo->commit();
        } catch (\Exception $e) {
            $pdo->rollBack();
            // Retornamos 500 para tentar receber novamente caso ocorra um erro de concorrência ou banco
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    }
}

http_response_code(200);
echo json_encode(['success' => true]);
exit;
