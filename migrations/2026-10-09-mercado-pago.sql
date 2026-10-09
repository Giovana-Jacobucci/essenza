-- Executar uma vez no banco de produção antes de publicar os arquivos PHP/JS.
ALTER TABLE payments
  MODIFY method ENUM('pix','credit_card','boleto','debit_card','mercado_pago') NOT NULL;
