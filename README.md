# Codigo Judaico App

Frontend em React/Vite com backend em ASP.NET Core 10, PostgreSQL, checkout Stripe e liberacao automatica de acesso por e-mail.

## O que mudou

- checkout da Kirvano substituido por Stripe Checkout
- suporte a Stripe Connect com retencao da plataforma e repasse para `connected account`
- login real com e-mail + senha criada no checkout, com e-mail de acesso apos pagamento confirmado
- sessao autenticada por token no frontend e no backend
- webhook Stripe para ativar o usuario, sincronizar assinatura e atualizar proxima cobranca
- endpoints premium protegidos por autenticacao
- migration nova para senha, sessao e dados de assinatura

## Fluxo atual

1. O usuario entra em `/checkout` e escolhe `mensal` ou `anual`.
2. O frontend pede ao backend uma Checkout Session do Stripe.
3. A API cria a conta antes do pagamento e envia um e-mail avisando que o cadastro foi criado.
4. O pagamento acontece no Stripe.
5. O webhook `POST /api/payments/webhooks/stripe` confirma a compra.
6. Quando a assinatura fica `active` ou `trialing`, a API libera o acesso e envia outro e-mail confirmando o pagamento e a liberacao do acesso.
7. O usuario entra em `/login` com o e-mail e a senha criada no checkout, ou com a senha temporaria enviada quando necessario.

## Configuracao obrigatoria

As chaves abaixo devem ficar no servico da API, nunca no frontend:

```env
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=codigo_judaico;Username=postgres;Password=postgres

Stripe__SecretKey=sk_live_...
Stripe__WebhookSecret=whsec_...
Stripe__ConnectedAccountId=acct_...
Stripe__FrontendBaseUrl=https://seu-dominio.com
Stripe__ApplicationKey=codigo-judaico
Stripe__RequiredCurrency=brl
Stripe__PlatformRetentionPercent=2

Stripe__Monthly__PriceId=price_...
Stripe__Monthly__PlanName=Premium Mensal
Stripe__Monthly__PromotionCouponId=coupon_...

Stripe__Annual__PriceId=price_...
Stripe__Annual__PlanName=Premium Anual

Resend__ApiKey=re_...
Resend__Enabled=true
Resend__From=noreply@codigomilenarjudaico.com
Resend__InboundWebhookSecret=
Resend__InboundWebhookDisableVerification=false
```

Observacoes:

- `Stripe__ApplicationKey` marca os checkouts e webhooks deste app. Use um valor exclusivo por projeto para evitar processar eventos de outros sistemas na mesma conta Stripe.
- `Stripe__RequiredCurrency` deve ficar como `brl`. O backend valida a moeda do `Price` antes de abrir o checkout e ignora webhooks com `Price` fora dessa moeda.
- `Stripe__Monthly__PromotionCouponId` e opcional. Use quando quiser manter a oferta de primeiro mes com desconto.
- `Stripe__Monthly__PriceId` e `Stripe__Annual__PriceId` sao obrigatorios e sao usados de verdade no checkout. Eles apontam para os `Prices` recorrentes da conta da plataforma Stripe e definem o valor e a moeda da assinatura.
- `Stripe__Monthly__PlanName` e `Stripe__Annual__PlanName` sao usados como rotulo interno no app, metadata do checkout e descricao da assinatura.
- `Stripe__Monthly__PromotionCouponId` so e aplicado quando estiver preenchido.
- o repasse para a connected account usa `transfer_data.destination` com `application_fee_percent`; por padrao, `2%` vira taxa da plataforma no Stripe e aparece em `Collected fees`.
- `Resend__Enabled` deve ficar `true` no ambiente que realmente vai enviar os e-mails.
- `Resend__InboundWebhookSecret` e `Resend__InboundWebhookDisableVerification` ficam prontos para o momento em que voce adicionar um webhook inbound da Resend. O fluxo atual de liberacao de acesso usa apenas envio.
- se `Resend` estiver habilitado sem `ApiKey` ou `From`, a API vai liberar o acesso mesmo assim, mas registrara um aviso e nao conseguira enviar o e-mail.

## Stripe

Voce precisa configurar no Stripe:

- um `Price` mensal recorrente na conta da plataforma
- um `Price` anual recorrente na conta da plataforma
- opcionalmente um `Coupon` para o desconto do primeiro mes
- um webhook apontando para:

```text
POST https://seu-dominio-api.com/api/payments/webhooks/stripe
```

Eventos recomendados:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Desenvolvimento

### Backend

```bash
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Port=5432;Database=codigo_judaico;Username=postgres;Password=postgres" --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
dotnet run --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
```

### Frontend

```bash
npm install
npm run dev
```

## Docker / Easypanel

O frontend continua sendo servido pelo Nginx e falando com a API via `/api`.

No servico `api`, alem da string de conexao do Postgres, configure tambem:

- `Stripe__SecretKey`
- `Stripe__WebhookSecret`
- `Stripe__ConnectedAccountId`
- `Stripe__FrontendBaseUrl`
- `Stripe__ApplicationKey`
- `Stripe__Monthly__PriceId`
- `Stripe__Monthly__PromotionCouponId` se usar promo
- `Stripe__Annual__PriceId`
- `Resend__ApiKey`
- `Resend__Enabled`
- `Resend__From`
- `Resend__InboundWebhookSecret`
- `Resend__InboundWebhookDisableVerification`

## Comandos uteis

```bash
dotnet build CodigoJudaicoApp.slnx
dotnet dotnet-ef database update --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
npm run build
```

## Validacao feita

- `dotnet build backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj`
- `dotnet dotnet-ef migrations add AddStripeAuthAndSessions ...`
- `npm run build`

## Observacao

`npm run lint` ainda pode falhar por problemas antigos do projeto em arquivos nao relacionados a este fluxo. O build de producao segue funcionando.
