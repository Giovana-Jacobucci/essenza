<?php
/** Checkout Pro: apenas o servidor conhece o access token. */

function mercadoPagoSetting(string $name): string {
    $environment = getenv($name);
    if ($environment !== false && trim((string) $environment) !== '') return trim((string) $environment);
    return defined($name) ? trim((string) constant($name)) : '';
}

function mercadoPagoConfigured(): bool {
    $collectorId = mercadoPagoSetting('MP_EXPECTED_COLLECTOR_ID');
    return mercadoPagoSetting('MP_ACCESS_TOKEN') !== '' && ctype_digit($collectorId);
}

function mercadoPagoToken(): string {
    $token = mercadoPagoSetting('MP_ACCESS_TOKEN');
    if ($token === '') throw new RuntimeException('Mercado Pago não configurado');
    return $token;
}

function mercadoPagoCollectorId(): string {
    $id = mercadoPagoSetting('MP_EXPECTED_COLLECTOR_ID');
    if ($id === '' || !ctype_digit($id)) {
        throw new RuntimeException('Conta recebedora do Mercado Pago não configurada');
    }
    return $id;
}

function mercadoPagoRequest(string $method, string $path, ?array $body = null, ?string $idempotencyKey = null): array {
    $url = 'https://api.mercadopago.com' . $path;
    $headers = [
        'Authorization: Bearer ' . mercadoPagoToken(),
        'Content-Type: application/json',
        'Accept: application/json',
    ];
    if ($idempotencyKey !== null) $headers[] = 'X-Idempotency-Key: ' . $idempotencyKey;
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    if ($body !== null) curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
    $response = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $error = curl_error($curl);
    curl_close($curl);
    if ($response === false || $status < 200 || $status >= 300) {
        error_log('Mercado Pago HTTP ' . $status . ': ' . $error . ' ' . substr((string) $response, 0, 500));
        throw new RuntimeException('Não foi possível iniciar o pagamento. Tente novamente.');
    }
    $data = json_decode($response, true);
    if (!is_array($data)) throw new RuntimeException('Resposta inválida do Mercado Pago');
    return $data;
}

function mercadoPagoPreference(string $orderId, int $orderNumber, array $items, float $shippingCost, string $email): array {
    $lineItems = array_map(static fn(array $item): array => [
        'id' => $item['product_id'],
        'title' => $item['product_name'],
        'quantity' => (int) $item['quantity'],
        'currency_id' => 'BRL',
        'unit_price' => (float) $item['unit_price'],
    ], $items);
    if ($shippingCost > 0) {
        $lineItems[] = [
            'id' => 'frete', 'title' => 'Frete', 'quantity' => 1,
            'currency_id' => 'BRL', 'unit_price' => $shippingCost,
        ];
    }
    $returnUrl = SITE_URL . '/pagamento.html?pedido=' . $orderNumber;
    $preference = mercadoPagoRequest('POST', '/checkout/preferences', [
        'items' => $lineItems,
        'payer' => ['email' => $email],
        'external_reference' => $orderId,
        'back_urls' => [
            'success' => $returnUrl, 'failure' => $returnUrl, 'pending' => $returnUrl,
        ],
        'auto_return' => 'approved',
        'statement_descriptor' => 'ESSENZA',
    ], $orderId);
    if ((string) ($preference['collector_id'] ?? '') !== mercadoPagoCollectorId()) {
        error_log('Mercado Pago: collector_id inesperado ao criar preferência');
        throw new RuntimeException('Conta recebedora do Mercado Pago não corresponde à configurada');
    }
    $sandbox = mercadoPagoSetting('MP_USE_SANDBOX') === '1';
    $checkoutUrl = $sandbox ? ($preference['sandbox_init_point'] ?? '') : ($preference['init_point'] ?? '');
    if (empty($preference['id']) || !filter_var($checkoutUrl, FILTER_VALIDATE_URL)) {
        throw new RuntimeException('Mercado Pago não retornou um checkout válido');
    }
    return ['id' => (string) $preference['id'], 'checkout_url' => $checkoutUrl];
}

function mercadoPagoWebhookValid(string $dataId): bool {
    $secret = mercadoPagoSetting('MP_WEBHOOK_SECRET');
    $requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
    $signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
    if ($secret === '' || $requestId === '' || $signature === '') return false;
    $parts = [];
    foreach (explode(',', $signature) as $part) {
        $pair = explode('=', trim($part), 2);
        if (count($pair) === 2) $parts[$pair[0]] = $pair[1];
    }
    $ts = $parts['ts'] ?? '';
    $hash = $parts['v1'] ?? '';
    if (!ctype_digit($ts) || !preg_match('/^[a-f0-9]{64}$/i', $hash)) return false;
    // Reentregas podem ocorrer horas depois; a atualização do pedido é idempotente.
    $manifest = 'id:' . strtolower($dataId) . ';request-id:' . $requestId . ';ts:' . $ts . ';';
    return hash_equals(hash_hmac('sha256', $manifest, $secret), strtolower($hash));
}
