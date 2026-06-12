<?php
/**
 * ESSENZA — API Admin
 * Dashboard, gestão de pedidos, clientes e configurações
 * Acesso restrito a role = 'admin'
 */

$admin = Auth::requireAdmin();
$subPath = '/' . implode('/', array_slice($segments, 1));
$pdo = Database::getInstance();

switch (true) {

    // ── GET /api/admin/dashboard ──
    case $method === 'GET' && $subPath === '/dashboard':
        // Total de vendas (pedidos não cancelados)
        $stmt = $pdo->query(
            "SELECT COALESCE(SUM(total), 0) as total_revenue,
                    COUNT(*) as total_orders
             FROM orders WHERE status != 'cancelled'"
        );
        $revenue = $stmt->fetch();

        // Pedidos este mês
        $stmt = $pdo->query(
            "SELECT COALESCE(SUM(total), 0) as monthly_revenue,
                    COUNT(*) as monthly_orders
             FROM orders
             WHERE status != 'cancelled'
             AND MONTH(created_at) = MONTH(NOW())
             AND YEAR(created_at) = YEAR(NOW())"
        );
        $monthly = $stmt->fetch();

        // Clientes cadastrados
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE role = 'customer'");
        $totalCustomers = $stmt->fetch()['total'];

        // Produtos ativos
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM products WHERE is_active = 1");
        $totalProducts = $stmt->fetch()['total'];

        // Pedidos por status
        $stmt = $pdo->query(
            "SELECT status, COUNT(*) as count FROM orders GROUP BY status"
        );
        $byStatus = [];
        while ($row = $stmt->fetch()) {
            $byStatus[$row['status']] = [
                'count' => (int) $row['count'],
                'label' => statusLabel($row['status']),
            ];
        }

        // Pedidos recentes (últimos 10)
        $stmt = $pdo->query(
            "SELECT o.id, o.order_number, o.total, o.status, o.created_at,
                    u.name as customer_name, u.email as customer_email
             FROM orders o
             JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC LIMIT 10"
        );
        $recentOrders = $stmt->fetchAll();
        foreach ($recentOrders as &$ro) {
            $ro['status_label'] = statusLabel($ro['status']);
        }

        // Produtos com estoque baixo (< 5)
        $stmt = $pdo->query(
            "SELECT p.id, p.name, p.sku, p.stock, p.price
             FROM products p
             WHERE p.is_active = 1 AND p.stock <= 5
             ORDER BY p.stock ASC LIMIT 10"
        );
        $lowStock = $stmt->fetchAll();

        // Faturamento últimos 6 meses
        $stmt = $pdo->query(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
                    COALESCE(SUM(total), 0) as revenue,
                    COUNT(*) as orders
             FROM orders
             WHERE status != 'cancelled'
             AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month"
        );
        $monthlyChart = $stmt->fetchAll();

        jsonResponse([
            'total_revenue'    => (float) $revenue['total_revenue'],
            'total_orders'     => (int) $revenue['total_orders'],
            'monthly_revenue'  => (float) $monthly['monthly_revenue'],
            'monthly_orders'   => (int) $monthly['monthly_orders'],
            'total_customers'  => (int) $totalCustomers,
            'total_products'   => (int) $totalProducts,
            'orders_by_status' => $byStatus,
            'recent_orders'    => $recentOrders,
            'low_stock'        => $lowStock,
            'monthly_chart'    => $monthlyChart,
        ]);
        break;

    // ── GET /api/admin/orders ── (todos os pedidos com filtros)
    case $method === 'GET' && $subPath === '/orders':
        $page     = (int) ($_GET['page'] ?? 1);
        $perPage  = (int) ($_GET['per_page'] ?? 20);
        $status   = $_GET['status'] ?? null;
        $search   = $_GET['search'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo   = $_GET['date_to'] ?? null;
        $payment  = $_GET['payment'] ?? null;

        $where = ['1=1'];
        $params = [];

        if ($status) {
            $where[] = 'o.status = ?';
            $params[] = $status;
        }

        if ($search) {
            $where[] = '(u.name LIKE ? OR u.email LIKE ? OR u.cpf LIKE ? OR o.order_number = ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = $search;
        }

        if ($dateFrom) {
            $where[] = 'o.created_at >= ?';
            $params[] = $dateFrom . ' 00:00:00';
        }

        if ($dateTo) {
            $where[] = 'o.created_at <= ?';
            $params[] = $dateTo . ' 23:59:59';
        }

        $whereClause = implode(' AND ', $where);

        $joinPayment = '';
        if ($payment) {
            $joinPayment = 'JOIN payments pay ON pay.order_id = o.id AND pay.method = ' . $pdo->quote($payment);
        }

        // Contagem
        $countSql = "SELECT COUNT(*) as total FROM orders o
                     JOIN users u ON o.user_id = u.id
                     $joinPayment
                     WHERE $whereClause";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = $stmt->fetch()['total'];
        $pagination = paginate($page, $perPage, $total);

        // Dados
        $sql = "SELECT o.*, u.name as customer_name, u.email as customer_email,
                       u.cpf as customer_cpf, u.phone as customer_phone,
                       DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') as formatted_date
                FROM orders o
                JOIN users u ON o.user_id = u.id
                $joinPayment
                WHERE $whereClause
                ORDER BY o.created_at DESC
                LIMIT {$pagination['per_page']} OFFSET {$pagination['offset']}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $order['status_label'] = statusLabel($order['status']);
            // Buscar pagamento
            $stmt2 = $pdo->prepare('SELECT method, status as payment_status FROM payments WHERE order_id = ? LIMIT 1');
            $stmt2->execute([$order['id']]);
            $pay = $stmt2->fetch();
            $order['payment_method'] = $pay ? $pay['method'] : null;
            $order['payment_label'] = $pay ? paymentMethodLabel($pay['method']) : '-';
        }

        jsonResponse(['data' => $orders, 'pagination' => $pagination]);
        break;

    // ── GET /api/admin/orders/{id} ── (detalhes completos do pedido)
    case $method === 'GET' && preg_match('#^/orders/([a-f0-9-]{36})$#', $subPath, $m):
        $orderId = $m[1];

        $stmt = $pdo->prepare(
            "SELECT o.*, u.name as customer_name, u.email as customer_email,
                    u.cpf as customer_cpf, u.phone as customer_phone,
                    DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') as formatted_date
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ? LIMIT 1"
        );
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            jsonError('Pedido não encontrado', 404);
        }

        $order['status_label'] = statusLabel($order['status']);

        // Itens
        $stmt = $pdo->prepare(
            'SELECT oi.*, p.image FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?'
        );
        $stmt->execute([$orderId]);
        $order['items'] = $stmt->fetchAll();

        // Pagamento
        $stmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ?');
        $stmt->execute([$orderId]);
        $order['payment'] = $stmt->fetch();

        // Timeline
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

    // ── PUT /api/admin/orders/{id}/status ── (alterar status)
    case $method === 'PUT' && preg_match('#^/orders/([a-f0-9-]{36})/status$#', $subPath, $m):
        $orderId = $m[1];
        $data = getJsonBody();
        $newStatus = $data['status'] ?? '';
        $notes = $data['notes'] ?? null;

        $validStatuses = ['pending_payment','paid','processing','shipped','out_for_delivery','delivered','cancelled'];
        if (!in_array($newStatus, $validStatuses)) {
            jsonError('Status inválido');
        }

        // Atualizar pedido
        $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $stmt->execute([$newStatus, $orderId]);

        if ($stmt->rowCount() === 0) {
            jsonError('Pedido não encontrado', 404);
        }

        // Se marcado como pago, atualizar pagamento
        if ($newStatus === 'paid') {
            $stmt = $pdo->prepare(
                "UPDATE payments SET status = 'approved', paid_at = NOW() WHERE order_id = ?"
            );
            $stmt->execute([$orderId]);
        }

        // Registrar no histórico
        $stmt = $pdo->prepare(
            'INSERT INTO order_status_history (order_id, status, notes, changed_by)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$orderId, $newStatus, $notes, $admin['id']]);

        logAdminAction('update_order_status', 'order', $orderId, "Status: $newStatus");

        jsonResponse(['message' => 'Status atualizado com sucesso', 'status_label' => statusLabel($newStatus)]);
        break;

    // ── GET /api/admin/customers ──
    case $method === 'GET' && $subPath === '/customers':
        $page    = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 20);
        $search  = $_GET['search'] ?? null;

        $where = ["role = 'customer'"];
        $params = [];

        if ($search) {
            $where[] = '(name LIKE ? OR email LIKE ? OR cpf LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM users WHERE $whereClause");
        $stmt->execute($params);
        $total = $stmt->fetch()['total'];
        $pagination = paginate($page, $perPage, $total);

        $sql = "SELECT id, name, email, cpf, phone, created_at, last_login, is_active
                FROM users WHERE $whereClause
                ORDER BY created_at DESC
                LIMIT {$pagination['per_page']} OFFSET {$pagination['offset']}";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonResponse(['data' => $stmt->fetchAll(), 'pagination' => $pagination]);
        break;

    // ── GET /api/admin/customers/{id} ──
    case $method === 'GET' && preg_match('#^/customers/([a-f0-9-]{36})$#', $subPath, $m):
        $customerId = $m[1];

        $stmt = $pdo->prepare(
            "SELECT id, name, email, cpf, phone, birth_date, created_at, last_login, is_active
             FROM users WHERE id = ? AND role = 'customer'"
        );
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch();

        if (!$customer) {
            jsonError('Cliente não encontrado', 404);
        }

        // Endereços
        $stmt = $pdo->prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC');
        $stmt->execute([$customerId]);
        $customer['addresses'] = $stmt->fetchAll();

        // Pedidos
        $stmt = $pdo->prepare(
            "SELECT id, order_number, total, status, created_at FROM orders
             WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
        );
        $stmt->execute([$customerId]);
        $orders = $stmt->fetchAll();
        foreach ($orders as &$o) $o['status_label'] = statusLabel($o['status']);
        $customer['orders'] = $orders;

        jsonResponse($customer);
        break;

    // ── GET /api/admin/settings ──
    case $method === 'GET' && $subPath === '/settings':
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM site_settings');
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        jsonResponse($settings);
        break;

    // ── PUT /api/admin/settings ──
    case $method === 'PUT' && $subPath === '/settings':
        $data = getJsonBody();

        $stmt = $pdo->prepare(
            'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );

        foreach ($data as $key => $value) {
            $stmt->execute([$key, $value]);
        }

        logAdminAction('update_settings', 'settings', null, json_encode(array_keys($data)));
        jsonResponse(['message' => 'Configurações atualizadas']);
        break;

    // ── GET /api/admin/logs ──
    case $method === 'GET' && $subPath === '/logs':
        $page    = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 50);

        $stmt = $pdo->query('SELECT COUNT(*) as total FROM admin_logs');
        $total = $stmt->fetch()['total'];
        $pagination = paginate($page, $perPage, $total);

        $stmt = $pdo->prepare(
            "SELECT al.*, u.name as user_name,
                    DATE_FORMAT(al.created_at, '%d/%m/%Y %H:%i') as formatted_date
             FROM admin_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT {$pagination['per_page']} OFFSET {$pagination['offset']}"
        );
        $stmt->execute();

        jsonResponse(['data' => $stmt->fetchAll(), 'pagination' => $pagination]);
        break;

    default:
        jsonError('Endpoint não encontrado', 404);
}
