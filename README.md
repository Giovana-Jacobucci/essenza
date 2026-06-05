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
- Os produtos são salvos no navegador usando `localStorage`.
- Para uma loja definitiva, troque esse armazenamento por banco de dados e login real.

## Ajustes importantes antes de vender

No arquivo `script.js`:

- Troque `WHATSAPP_NUMBER` pelo número da loja no formato `55DDDNUMERO`.
- Troque `ADMIN_PIN` por uma senha provisória diferente.
- Substitua a tabela local de frete por API dos Correios, Melhor Envio ou Frenet se quiser cálculo oficial por contrato.
- Conecte um gateway de pagamento como Mercado Pago, PagSeguro, Pagar.me ou Stripe Brasil.

## Sobre o frete

O site consulta o endereço no ViaCEP e calcula o frete por UF, peso e subtotal. Isso funciona para simulação comercial rápida, mas frete oficial com etiqueta, prazo e rastreio exige integração com uma API logística.
