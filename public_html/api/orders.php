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
    case $method === 'GET' && preg_match('#^/([a-f0-9-]{36})$#', $subPath, $m):
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

            // Registrar pagamento
            $paymentId = generateUUID();
            $stmt = $pdo->prepare(
                'INSERT INTO payments (id, order_id, method, amount, status)
                 VALUES (?, ?, ?, ?, "pending")'
            );
            $stmt->execute([$paymentId, $orderId, $data['payment_method'], $total]);

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
                'id'           => $orderId,
                'order_number' => $orderNumber,
                'total'        => $total,
                'message'      => 'Pedido criado com sucesso',
            ], 201);

        } catch (\Exception $e) {
            $pdo->rollBack();
            jsonError($e->getMessage(), 400);
        }
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
