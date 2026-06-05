# Essenza - site da loja

Site em produção: [https://essenzamodaeperfumaria.com/](https://essenzamodaeperfumaria.com/)

Arquivos principais:

- `index.html`: site completo com loja, carrinho, checkout e painel admin.
- `styles.css`: visual responsivo.
- `script.js`: catálogo, carrinho, CEP/ViaCEP, frete, admin e envio do pedido.
- `assets/essenza.jpeg`: logo da marca.

## Como publicar na Hostinger

1. Abra o gerenciador de arquivos da Hostinger.
2. Entre na pasta `public_html` do domínio.
3. Envie todos os arquivos desta pasta `essenza-site`.
4. Acesse [https://essenzamodaeperfumaria.com/](https://essenzamodaeperfumaria.com/) e teste a compra.

## Painel admin

Clique em `ADM` no topo do site.

- Senha inicial: `2026`
- Os produtos são salvos no banco de dados MySQL.
- Configurações do banco:
  - Banco: `u560112854_essenza_banco`
  - Usuário: `u560112854_essenza`
  - Senha: `Donadel@10`

## Configuração do Banco de Dados

Antes de publicar, configure o banco de dados MySQL:

1. Acesse o phpMyAdmin da Hostinger
2. Selecione o banco `u560112854_essenza_banco`
3. Importe o arquivo `database.sql` para criar a tabela de produtos
4. Verifique se o arquivo `api.php` está configurado com as credenciais corretas

O arquivo `api.php` já está configurado com as credenciais fornecidas. Se precisar alterar, edite as linhas:

```php
$db_host = 'localhost';
$db_name = 'u560112854_essenza_banco';
$db_user = 'u560112854_essenza';
$db_pass = 'Donadel@10';
```

## Ajustes importantes antes de vender

No arquivo `script.js`:

- Troque `WHATSAPP_NUMBER` pelo número da loja no formato `55DDDNUMERO`.
- Troque `ADMIN_PIN` por uma senha provisória diferente.
- Substitua a tabela local de frete por API dos Correios, Melhor Envio ou Frenet se quiser cálculo oficial por contrato.
- Conecte um gateway de pagamento como Mercado Pago, PagSeguro, Pagar.me ou Stripe Brasil.

## Sobre o frete

O site consulta o endereço no ViaCEP e calcula o frete por UF, peso e subtotal. Isso funciona para simulação comercial rápida, mas frete oficial com etiqueta, prazo e rastreio exige integração com uma API logística.
