<?php
/**
 * ESSENZA — Conexão com Banco de Dados
 * Singleton PDO com prepared statements obrigatórios
 */

require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;

    /**
     * Retorna a instância única do PDO
     */
    public static function getInstance(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = sprintf(
                    'mysql:host=%s;dbname=%s;charset=%s',
                    DB_HOST,
                    DB_NAME,
                    DB_CHARSET
                );

                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,  // prepared statements reais
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'",
                ]);
            } catch (PDOException $e) {
                // Não expor detalhes do erro em produção
                if (APP_ENV === 'development') {
                    throw $e;
                }
                http_response_code(500);
                echo json_encode(['error' => 'Erro de conexão com o banco de dados']);
                exit;
            }
        }

        return self::$instance;
    }

    /**
     * Impede clonagem e instanciação direta
     */
    private function __construct() {}
    private function __clone() {}
}
