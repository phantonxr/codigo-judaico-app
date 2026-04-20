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

1. O primeiro checkout publico usa o plano `primeiro-acesso`: 21 dias por `R$ 29,90`.
2. O frontend pede ao backend uma Checkout Session do Stripe para o plano escolhido.
3. A API cria a conta antes do pagamento e envia um e-mail avisando que o cadastro foi criado.
4. O pagamento acontece no Stripe.
5. O webhook `POST /api/payments/webhooks/stripe` confirma a compra.
6. Quando o pagamento libera o acesso, a API atualiza o prazo da assinatura, envia o e-mail de acesso e grava a proxima data de cobranca.
7. Depois que o usuario ja teve acesso, a tela `/assinatura` oferece:
   - `renovacao`: +21 dias por `R$ 17,90` (somente uma vez)
   - `mensal`: `R$ 37,90`
   - `anual`: `R$ 297,90`
   - `vitalicio`: `R$ 497,90`
8. Se a assinatura vencer, o usuario continua autenticando, mas as areas premium ficam bloqueadas ate renovar pela tela `/assinatura`.

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

Stripe__FirstAccess__PriceId=price_...
Stripe__FirstAccess__PlanName=Primeiro Acesso

Stripe__Renewal__PriceId=price_...
Stripe__Renewal__PlanName=Renovacao Especial

Stripe__Monthly__PriceId=price_...
Stripe__Monthly__PlanName=Premium Mensal
Stripe__Monthly__PromotionCouponId=coupon_...

Stripe__Annual__PriceId=price_...
Stripe__Annual__PlanName=Premium Anual

Stripe__Lifetime__PriceId=price_...
Stripe__Lifetime__PlanName=Acesso Vitalicio

Resend__ApiKey=re_...
Resend__Enabled=true
Resend__From=noreply@codigomilenarjudaico.com
Resend__InboundWebhookSecret=
Resend__InboundWebhookDisableVerification=false
```

Observacoes:

- `Stripe__ApplicationKey` marca os checkouts e webhooks deste app. Use um valor exclusivo por projeto para evitar processar eventos de outros sistemas na mesma conta Stripe.
- `Stripe__RequiredCurrency` deve ficar como `brl`. O backend valida a moeda do `Price` antes de abrir o checkout e ignora webhooks com `Price` fora dessa moeda.
- `Stripe__FirstAccess__PriceId` e obrigatorio para o checkout inicial de 21 dias por `R$ 29,90`.
- `Stripe__Renewal__PriceId` e obrigatorio se voce quiser vender a renovacao especial de `R$ 17,90`.
- `Stripe__Monthly__PriceId` e `Stripe__Annual__PriceId` sao os `Prices` recorrentes da conta da plataforma Stripe.
- `Stripe__Lifetime__PriceId` e obrigatorio se voce quiser habilitar o acesso vitalicio.
- `Stripe__FirstAccess__PlanName`, `Stripe__Renewal__PlanName`, `Stripe__Monthly__PlanName`, `Stripe__Annual__PlanName` e `Stripe__Lifetime__PlanName` sao usados como rotulo interno no app, metadata do checkout e descricao da compra.
- `Stripe__Monthly__PromotionCouponId` so e aplicado quando estiver preenchido.
- o repasse para a connected account usa `transfer_data.destination` com `application_fee_percent`; por padrao, `2%` vira taxa da plataforma no Stripe e aparece em `Collected fees`.
- `Resend__Enabled` deve ficar `true` no ambiente que realmente vai enviar os e-mails.
- `Resend__InboundWebhookSecret` e `Resend__InboundWebhookDisableVerification` ficam prontos para o momento em que voce adicionar um webhook inbound da Resend. O fluxo atual de liberacao de acesso usa apenas envio.
- se `Resend` estiver habilitado sem `ApiKey` ou `From`, a API vai liberar o acesso mesmo assim, mas registrara um aviso e nao conseguira enviar o e-mail.

## Stripe

Voce precisa configurar no Stripe:

- um `Price` de pagamento unico para `Primeiro Acesso` no valor de `R$ 29,90`
- um `Price` de pagamento unico para `Renovacao Especial` no valor de `R$ 17,90`
- um `Price` mensal recorrente no valor de `R$ 37,90`
- um `Price` anual recorrente no valor de `R$ 297,90`
- um `Price` de pagamento unico para `Acesso Vitalicio` no valor de `R$ 497,90`
- opcionalmente um `Coupon` para qualquer promocao que voce quiser aplicar
- um webhook apontando para:

```text
POST https://seu-dominio-api.com/api/payments/webhooks/stripe
```

Eventos recomendados:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Mapeamento sugerido no Stripe

- `Stripe__FirstAccess__PriceId`: price one-time BRL `29.90`
- `Stripe__Renewal__PriceId`: price one-time BRL `17.90`
- `Stripe__Monthly__PriceId`: subscription monthly BRL `37.90`
- `Stripe__Annual__PriceId`: subscription yearly BRL `297.90`
- `Stripe__Lifetime__PriceId`: price one-time BRL `497.90`

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
- `Stripe__FirstAccess__PriceId`
- `Stripe__Renewal__PriceId`
- `Stripe__Monthly__PriceId`
- `Stripe__Monthly__PromotionCouponId` se usar promo
- `Stripe__Annual__PriceId`
- `Stripe__Lifetime__PriceId`
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
