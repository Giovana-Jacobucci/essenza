<?php
/**
 * ESSENZA — Funções Auxiliares
 * Utilidades compartilhadas por todos os módulos da API
 */

/**
 * Lê e decodifica o body JSON da requisição
 */
function getJsonBody(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

/**
 * Envia resposta JSON com status code
 */
function jsonResponse(mixed $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Envia resposta de erro
 */
function jsonError(string $message, int $status = 400): void {
    jsonResponse(['error' => $message], $status);
}

/**
 * Valida campos obrigatórios no array de dados
 * Retorna array com os campos faltantes
 */
function validateRequired(array $data, array $fields): array {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    return $missing;
}

/**
 * Valida formato de e-mail
 */
function validateEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Valida e formata CPF (aceita com ou sem pontuação)
 */
function validateCpf(string $cpf): bool {
    $cpf = preg_replace('/\D/', '', $cpf);
    if (strlen($cpf) !== 11) return false;
    if (preg_match('/^(\d)\1{10}$/', $cpf)) return false;

    // Validação dos dígitos verificadores
    for ($t = 9; $t < 11; $t++) {
        $d = 0;
        for ($c = 0; $c < $t; $c++) {
            $d += $cpf[$c] * (($t + 1) - $c);
        }
        $d = ((10 * $d) % 11) % 10;
        if ($cpf[$t] != $d) return false;
    }

    return true;
}

/**
 * Valida número de telefone brasileiro (10 ou 11 dígitos, DDD válido de 11 a 99)
 */
function validatePhone(string $phone): bool {
    $digits = preg_replace('/\D/', '', $phone);
    if ($digits === '') return true; // Opcional no banco
    $len = strlen($digits);
    if ($len !== 10 && $len !== 11) return false;

    $ddd = (int) substr($digits, 0, 2);
    if ($ddd < 11 || $ddd > 99) return false;

    if ($len === 11 && $digits[2] !== '9') return false;

    return true;
}

/**
 * Formata CPF para exibição: 000.000.000-00
 */
function formatCpf(string $cpf): string {
    $cpf = preg_replace('/\D/', '', $cpf);
    return preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $cpf);
}

/**
 * Limpa CPF para armazenamento: remove pontuação
 */
function cleanCpf(string $cpf): string {
    return preg_replace('/\D/', '', $cpf);
}

/**
 * Gera UUID v4
 */
function generateUUID(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Converte valor para centavos (int) para cálculos seguros
 */
function toCents(float $value): int {
    return (int) round($value * 100);
}

/**
 * Converte centavos de volta para reais
 */
function fromCents(int $cents): float {
    return $cents / 100;
}

/**
 * Mapeia status para label em português
 */
function statusLabel(string $status): string {
    return match ($status) {
        'pending_payment'  => 'Aguardando Pagamento',
        'paid'             => 'Pago',
        'processing'       => 'Em Separação',
        'shipped'          => 'Enviado',
        'out_for_delivery' => 'Saiu para Entrega',
        'delivered'        => 'Entregue',
        'cancelled'        => 'Cancelado',
        default            => $status,
    };
}

/**
 * Mapeia método de pagamento para label
 */
function paymentMethodLabel(string $method): string {
    return match ($method) {
        'pix'         => 'PIX',
        'credit_card' => 'Cartão de Crédito',
        'debit_card'  => 'Cartão de Débito',
        'boleto'      => 'Boleto',
        default       => $method,
    };
}

/**
 * Registra ação no log administrativo
 */
function logAdminAction(string $action, ?string $entityType = null, ?string $entityId = null, ?string $details = null): void {
    try {
        $pdo = Database::getInstance();
        $userId = $_SESSION['user_id'] ?? null;
        $ip = Security::getClientIp();

        $stmt = $pdo->prepare(
            'INSERT INTO admin_logs (user_id, action, entity_type, entity_id, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $entityType, $entityId, $details, $ip]);
    } catch (\Exception $e) {
        // Não interromper fluxo se log falhar
    }
}

/**
 * Paginação — calcula offset e retorna metadata
 */
function paginate(int $page, int $perPage, int $total): array {
    $page = max(1, $page);
    $perPage = min(100, max(1, $perPage));
    $totalPages = max(1, (int) ceil($total / $perPage));
    $offset = ($page - 1) * $perPage;

    return [
        'page'        => $page,
        'per_page'    => $perPage,
        'total'       => $total,
        'total_pages' => $totalPages,
        'offset'      => $offset,
    ];
}
