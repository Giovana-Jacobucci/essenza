<?php
/**
 * ESSENZA — API de Pedidos
 * Criação, listagem e detalhes de pedidos do cliente
 */

$user = Auth::requireAuth();
$subPath = '/' . implode('/', array_slice($segments, 1));
$pdo = Database::getInstance();

switch (true) {

    // ── GET /api/orders ── (pedidos do cliente logado)
    case $method === 'GET' && ($subPath === '/' || $subPath === ''):
        $page    = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 10);

        $stmt = $pdo->prepare('SELECT COUNT(*) as total FROM orders WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        $total = $stmt->fetch()['total'];

        $pagination = paginate($page, $perPage, $total);

        $stmt = $pdo->prepare(
            "SELECT o.*, DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') as formatted_date
             FROM orders o
             WHERE o.user_id = ?
             ORDER BY o.created_at DESC
             LIMIT {$pagination['per_page']} OFFSET {$pagination['offset']}"
        );
        $stmt->execute([$user['id']]);
        $orders = $stmt->fetchAll();

        // Para cada pedido, buscar método de pagamento
        foreach ($orders as &$order) {
            $stmt = $pdo->prepare('SELECT method FROM payments WHERE order_id = ? LIMIT 1');
            $stmt->execute([$order['id']]);
            $payment = $stmt->fetch();
            $order['payment_method'] = $payment ? $payment['method'] : null;
            $order['status_label'] = statusLabel($order['status']);
            $order['payment_label'] = $payment ? paymentMethodLabel($payment['method']) : '-';
        }

        jsonResponse(['data' => $orders, 'pagination' => $pagination]);
        break;

    // ── GET /api/orders/{id} ── (detalhe de um pedido)
    case $method === 'GET' && preg_match('#^/([a-zA-Z0-9_-]+)$#', $subPath, $m):
        $orderId = $m[1];

        $stmt = $pdo->prepare(
            "SELECT o.*, DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') as formatted_date
             FROM orders o WHERE o.id = ? AND o.user_id = ? LIMIT 1"
        );
        $stmt->execute([$orderId, $user['id']]);
        $order = $stmt->fetch();

        if (!$order) {
            jsonError('Pedido não encontrado', 404);
        }

        $order['status_label'] = statusLabel($order['status']);

        // Itens do pedido
        $stmt = $pdo->prepare(
            'SELECT oi.*, p.image
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?'
        );
        $stmt->execute([$orderId]);
        $order['items'] = $stmt->fetchAll();

        // Pagamento
        $stmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1');
        $stmt->execute([$orderId]);
        $payment = $stmt->fetch();
        $order['payment'] = $payment;
        $order['payment_label'] = $payment ? paymentMethodLabel($payment['method']) : '-';

        // Timeline de status
        $stmt = $pdo->prepare(
            "SELECT osh.*, DATE_FORMAT(osh.created_at, '%d/%m/%Y') as date,
                    DATE_FORMAT(osh.created_at, '%H:%i') as time,
                    u.name as changed_by_name
             FROM order_status_history osh
             LEFT JOIN users u ON osh.changed_by = u.id
             WHERE osh.order_id = ?
             ORDER BY osh.created_at ASC"
        );
        $stmt->execute([$orderId]);
        $history = $stmt->fetchAll();

        foreach ($history as &$h) {
            $h['status_label'] = statusLabel($h['status']);
        }
        $order['status_history'] = $history;

        jsonResponse($order);
        break;

    // ── POST /api/orders ── (criar pedido)
    case $method === 'POST' && ($subPath === '/' || $subPath === ''):
        $data = getJsonBody();
        $missing = validateRequired($data, [
            'items', 'shipping_name', 'shipping_street', 'shipping_number',
            'shipping_neighborhood', 'shipping_city', 'shipping_state', 'shipping_zip',
            'payment_method'
        ]);

        if ($missing) {
            jsonError('Campos obrigatórios: ' . implode(', ', $missing));
        }

        if (empty($data['items']) || !is_array($data['items'])) {
            jsonError('O pedido deve conter pelo menos um item');
        }

        $pdo->beginTransaction();

        try {
            $orderId = generateUUID();
            $subtotal = 0;
            $orderItems = [];

            // Validar e calcular itens
            foreach ($data['items'] as $item) {
                $stmt = $pdo->prepare(
                    'SELECT id, name, sku, price, stock FROM products WHERE id = ? AND is_active = 1'
                );
                $stmt->execute([$item['product_id']]);
                $product = $stmt->fetch();

                if (!$product) {
                    throw new \RuntimeException("Produto não encontrado: {$item['product_id']}");
                }

                if ($product['stock'] < $item['quantity']) {
                    throw new \RuntimeException("Estoque insuficiente para: {$product['name']}");
                }

                $totalPrice = $product['price'] * $item['quantity'];
                $subtotal += $totalPrice;

                $orderItems[] = [
                    'product_id'   => $product['id'],
                    'product_name' => $product['name'],
                    'product_sku'  => $product['sku'],
                    'quantity'     => $item['quantity'],
                    'unit_price'   => $product['price'],
                    'total_price'  => $totalPrice,
                ];

                // Decrementar estoque
                $stmt = $pdo->prepare(
                    'UPDATE products SET stock = stock - ? WHERE id = ?'
                );
                $stmt->execute([$item['quantity'], $product['id']]);

                // Registrar movimentação de estoque
                $stmt = $pdo->prepare(
                    'INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, created_by)
                     VALUES (?, "out", ?, "Venda", ?, ?)'
                );
                $stmt->execute([$product['id'], $item['quantity'], $orderId, $user['id']]);
            }

            $shippingCost = (float) ($data['shipping_cost'] ?? 0);
            $discount     = (float) ($data['discount'] ?? 0);
            $total        = $subtotal + $shippingCost - $discount;

            // Criar pedido
            $stmt = $pdo->prepare(
                'INSERT INTO orders (id, user_id, subtotal, shipping_cost, discount, total, coupon_id,
                 shipping_name, shipping_street, shipping_number, shipping_complement,
                 shipping_neighborhood, shipping_city, shipping_state, shipping_zip,
                 shipping_estimate, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $orderId,
                $user['id'],
                $subtotal,
                $shippingCost,
                $discount,
                $total,
                $data['coupon_id'] ?? null,
                $data['shipping_name'],
                $data['shipping_street'],
                $data['shipping_number'],
                $data['shipping_complement'] ?? null,
                $data['shipping_neighborhood'],
                $data['shipping_city'],
                strtoupper($data['shipping_state']),
                $data['shipping_zip'],
                $data['shipping_estimate'] ?? null,
                $data['notes'] ?? null,
            ]);

            // Obter o order_number gerado
            $stmt = $pdo->prepare('SELECT order_number FROM orders WHERE id = ?');
            $stmt->execute([$orderId]);
            $orderNumber = $stmt->fetch()['order_number'];

            // Inserir itens do pedido
            $stmtItem = $pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            foreach ($orderItems as $oi) {
                $stmtItem->execute([
                    $orderId,
                    $oi['product_id'],
                    $oi['product_name'],
                    $oi['product_sku'],
                    $oi['quantity'],
                    $oi['unit_price'],
                    $oi['total_price'],
                ]);
            }

            // Registrar status inicial
            $stmt = $pdo->prepare(
                'INSERT INTO order_status_history (order_id, status, notes, changed_by)
                 VALUES (?, "pending_payment", "Pedido recebido", ?)'
            );
            $stmt->execute([$orderId, $user['id']]);

            // Registrar pagamento no Mercado Pago ou Simular localmente
            $paymentMethod = $data['payment_method']; // pix, credit_card, boleto
            $gatewayResponse = null;
            $transactionId = null;
            $paymentStatus = 'pending';
            $paidAt = null;
            $orderStatus = 'pending_payment';
            $mpMeta = []; // Para retornar Pix QR Code ou Boleto PDF

            $cleanCpf = preg_replace('/\D/', '', $user['cpf'] ?? '');
            $fullName = $data['shipping_name'] ?? $user['name'] ?? '';
            $nameParts = explode(' ', trim($fullName));
            $firstName = $nameParts[0] ?? 'Cliente';
            $lastName = isset($nameParts[1]) ? implode(' ', array_slice($nameParts, 1)) : 'Essenza';

            // Se for ambiente de desenvolvimento com chave de teste padrão OU APP_ENV for diferente de production
            $isMock = (APP_ENV !== 'production' || str_contains(MP_ACCESS_TOKEN, 'TEST-00000000') || !defined('MP_ACCESS_TOKEN'));

            if ($isMock) {
                // Simulação local / Sandbox Dev
                $transactionId = 'mock_mp_' . rand(100000, 999999);
                if ($paymentMethod === 'pix') {
                    $mpMeta = [
                        'qr_code_base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        'qr_code' => '00020101021226830014br.gov.bcb.pix2561api.mercadopago.com/pix/v2/mock-id-essenza-pix-payment-simulate'
                    ];
                    $gatewayResponse = json_encode(['mock' => true, 'payment_method' => 'pix']);
                } elseif ($paymentMethod === 'boleto') {
                    $mpMeta = [
                        'pdf_url' => 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                        'barcode' => '34191.79001 01043.513184 91020.150008 7 900000000' . round($total * 100)
                    ];
                    $gatewayResponse = json_encode(['mock' => true, 'payment_method' => 'boleto']);
                } else {
                    // Cartão de Crédito
                    // Se o nome no cartão ou titular contiver "REJEITAR", simula rejeição
                    if (str_contains(strtoupper($fullName), 'REJEITAR')) {
                        $paymentStatus = 'rejected';
                        $orderStatus = 'cancelled';
                    } else {
                        $paymentStatus = 'approved';
                        $orderStatus = 'paid';
                        $paidAt = date('Y-m-d H:i:s');
                    }
                    $gatewayResponse = json_encode(['mock' => true, 'payment_method' => 'credit_card', 'status' => $paymentStatus]);
                }
            } else {
                // Integração real com a API do Mercado Pago
                $mpPayload = [
                    'transaction_amount' => (float)$total,
                    'description' => 'Pedido #' . $orderNumber . ' na ' . SITE_NAME,
                    'external_reference' => $orderId,
                    'notification_url' => SITE_URL . '/api/mp-webhook',
                    'payer' => [
                        'email' => $user['email'],
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'identification' => [
                            'type' => 'CPF',
                            'number' => $cleanCpf
                        ]
                    ]
                ];

                if ($paymentMethod === 'pix') {
                    $mpPayload['payment_method_id'] = 'pix';
                } elseif ($paymentMethod === 'boleto') {
                    $mpPayload['payment_method_id'] = 'bolbradesco';
                } elseif ($paymentMethod === 'credit_card') {
                    $mpPayload['token'] = $data['token'] ?? '';
                    $mpPayload['installments'] = (int)($data['installments'] ?? 1);
                    $mpPayload['payment_method_id'] = $data['payment_method_id'] ?? '';
                    if (isset($data['issuer_id'])) {
                        $mpPayload['issuer_id'] = (int)$data['issuer_id'];
                    }
                }

                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, 'https://api.mercadopago.com/v1/payments');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($mpPayload));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . MP_ACCESS_TOKEN,
                    'Content-Type: application/json',
                    'X-Idempotency-Key: ' . $orderId
                ]);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode !== 200 && $httpCode !== 201) {
                    $errData = json_decode($response, true);
                    $errMsg = $errData['message'] ?? 'Erro desconhecido ao processar pagamento com Mercado Pago';
                    throw new \RuntimeException($errMsg);
                }

                $resData = json_decode($response, true);
                $transactionId = $resData['id'] ?? null;
                $status = $resData['status'] ?? 'pending';
                $gatewayResponse = $response;

                if ($status === 'approved') {
                    $paymentStatus = 'approved';
                    $orderStatus = 'paid';
                    $paidAt = date('Y-m-d H:i:s');
                } elseif (in_array($status, ['rejected', 'cancelled'])) {
                    $paymentStatus = 'rejected';
                    $orderStatus = 'cancelled';
                }

                // Extrair metadados dependendo do método de pagamento
                if ($paymentMethod === 'pix') {
                    $mpMeta = [
                        'qr_code_base64' => $resData['point_of_interaction']['transaction_data']['qr_code_base64'] ?? '',
                        'qr_code' => $resData['point_of_interaction']['transaction_data']['qr_code'] ?? ''
                    ];
                } elseif ($paymentMethod === 'boleto') {
                    $mpMeta = [
                        'pdf_url' => $resData['transaction_details']['external_resource_url'] ?? '',
                        'barcode' => $resData['barcode']['content'] ?? ''
                    ];
                }
            }

            // Atualizar o status inicial do pedido e do histórico se o pagamento mudou o status
            if ($orderStatus !== 'pending_payment') {
                $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
                $stmt->execute([$orderStatus, $orderId]);

                // Registrar o status atualizado no histórico
                $stmt = $pdo->prepare(
                    'INSERT INTO order_status_history (order_id, status, notes, changed_by)
                     VALUES (?, ?, ?, ?)'
                );
                $stmt->execute([$orderId, $orderStatus, 'Pagamento processado pelo gateway: ' . $paymentStatus, $user['id']]);
            }

            // Gravar o pagamento
            $paymentId = generateUUID();
            $stmt = $pdo->prepare(
                'INSERT INTO payments (id, order_id, method, amount, status, transaction_id, gateway_response, paid_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $paymentId,
                $orderId,
                $paymentMethod,
                $total,
                $paymentStatus,
                $transactionId,
                $gatewayResponse,
                $paidAt
            ]);

            // Limpar carrinho do usuário
            $stmt = $pdo->prepare('SELECT id FROM cart WHERE user_id = ?');
            $stmt->execute([$user['id']]);
            $cart = $stmt->fetch();
            if ($cart) {
                $stmt = $pdo->prepare('DELETE FROM cart_items WHERE cart_id = ?');
                $stmt->execute([$cart['id']]);
            }

            $pdo->commit();

            jsonResponse([
                'id'             => $orderId,
                'order_number'   => $orderNumber,
                'total'          => $total,
                'payment_status' => $paymentStatus,
                'mp_meta'        => $mpMeta,
                'message'        => 'Pedido criado com sucesso',
            ], 201);
        } catch (\Exception $e) {

            $pdo->rollBack();
            jsonError($e->getMessage(), 400);
        }
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
