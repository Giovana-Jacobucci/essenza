<?php
function uploadProductImage(): void {
    Auth::requireAdmin();
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 10000000) jsonError('Imagem muito grande. Limite: 8 MB.', 413);
    $data = getJsonBody();
    $image = $data['image'] ?? '';
    if (!is_string($image) || !preg_match('/^data:image\/(png|jpe?g|webp);base64,(.+)$/si', $image, $match)) {
        jsonError('Selecione uma foto PNG, JPG ou WebP válida');
    }
    $mimeSub = strtolower($match[1]);
    $bytes = base64_decode(trim($match[2]), true);
    if (!$bytes || strlen($bytes) > 8 * 1024 * 1024) jsonError('Imagem inválida ou maior que 8 MB');

    $info = @getimagesizefromstring($bytes);
    $validTypes = [
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_JPEG => 'jpg',
    ];
    if (defined('IMAGETYPE_WEBP')) {
        $validTypes[IMAGETYPE_WEBP] = 'webp';
    }

    $detectedType = $info ? ($info[2] ?? null) : null;
    if (!$detectedType || !isset($validTypes[$detectedType])) {
        if ($mimeSub === 'webp' && str_starts_with($bytes, 'RIFF') && substr($bytes, 8, 4) === 'WEBP') {
            $ext = 'webp';
        } else {
            jsonError('Formato de foto não suportado. Envie uma foto PNG, JPG ou WebP.');
        }
    } else {
        if ($info[0] > 10000 || $info[1] > 10000) jsonError('Dimensões da imagem muito grandes (máximo 10000px)');
        $ext = $validTypes[$detectedType];
    }

    $dir = __DIR__ . '/../uploads/products';
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            jsonError('Não foi possível criar a pasta uploads/products no servidor. Verifique permissões de pasta.', 500);
        }
    }
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    $filePath = $dir . '/' . $name;
    if (@file_put_contents($filePath, $bytes, LOCK_EX) === false) {
        jsonError('Não foi possível salvar o arquivo na pasta uploads/products. Verifique permissões de escrita.', 500);
    }
    jsonResponse(['image' => '/uploads/products/' . $name], 201);
}

function resolveProductCategory(PDO $pdo, array $data): array {
    if (empty($data['category'])) return $data;
    $categories = ['Perfumes'=>'perfumes', 'Body Splash'=>'body-splash', 'Cuidados Corporais'=>'cuidados-corporais',
        'Vestidos'=>'vestidos', 'Blusas'=>'blusas', 'Calças'=>'calcas', 'Roupas'=>'roupas', 'Acessórios'=>'acessorios'];
    $name = $data['category'];
    if (isset($categories[$name])) {
        $stmt = $pdo->prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, 6) ON DUPLICATE KEY UPDATE slug = VALUES(slug)');
        $stmt->execute([$name, $categories[$name]]);
    }
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE name = ? LIMIT 1');
    $stmt->execute([$name]);
    $id = $stmt->fetchColumn();
    if (!$id) jsonError('Categoria inválida');
    $data['category_id'] = $id;
    return $data;
}
