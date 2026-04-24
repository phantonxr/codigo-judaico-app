# Codigo Judaico App

Frontend em React/Vite com backend em ASP.NET Core 10, PostgreSQL, checkout Stripe e liberacao automatica de acesso por e-mail.

## O que mudou

- checkout da Kirvano substituido por Stripe Checkout
- metadata obrigatoria para o PaymentCore em todo checkout Stripe
- split condicional por pais da `connected account`: paises suportados mantem Stripe Connect; contas BR cobram 100% na conta principal
- login real com e-mail + senha criada no checkout, com e-mail de acesso apos pagamento confirmado
- sessao autenticada por token no frontend e no backend
- webhook Stripe para ativar o usuario, sincronizar assinatura e atualizar proxima cobranca
- endpoints premium protegidos por autenticacao
- migration nova para senha, sessao e dados de assinatura

## Fluxo atual

1. O primeiro checkout publico usa o plano `primeiro-acesso`: 21 dias por `R$ 29,90`.
2. O frontend pede ao backend uma Checkout Session do Stripe para o plano escolhido.
3. A API cria a conta antes do pagamento e envia um e-mail avisando que o cadastro foi criado.
4. Antes de criar a sessao, a API valida a metadata obrigatoria do PaymentCore: `app_id`, `app_name`, `tenant_id`, `seller_id`, `seller_name` e `order_id`.
5. O pagamento acontece no Stripe.
6. O PaymentCore usa essa metadata para identificar app, seller, tenant e pedido no webhook centralizado.
7. O webhook `POST /api/payments/webhooks/stripe` continua disponivel para reconciliacao/local processing deste app.
8. Quando o pagamento libera o acesso, a API atualiza o prazo da assinatura, envia o e-mail de acesso e grava a proxima data de cobranca.
9. Depois que o usuario ja teve acesso, a tela `/assinatura` oferece:
   - `renovacao`: +21 dias por `R$ 17,90` (somente uma vez)
   - `mensal`: `R$ 37,90`
   - `anual`: `R$ 297,90`
   - `vitalicio`: `R$ 497,90`
10. Se a assinatura vencer, o usuario continua autenticando, mas as areas premium ficam bloqueadas ate renovar pela tela `/assinatura`.

## Configuracao obrigatoria

As chaves abaixo devem ficar no servico da API, nunca no frontend:

```env
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=codigo_judaico;Username=postgres;Password=postgres

Stripe__SecretKey=sk_live_...
Stripe__WebhookSecret=whsec_...
Stripe__ConnectedAccountId=acct_...
Stripe__FrontendBaseUrl=https://seu-dominio.com
Stripe__ApplicationKey=codigo-judaico
Stripe__PaymentCoreAppName=Codigo Judaico
Stripe__PaymentCoreTenantId=tenant_...
Stripe__PaymentCoreSellerId=seller_...
Stripe__PaymentCoreSellerName=Codigo Judaico
Stripe__RequiredCurrency=brl
Stripe__PlatformRetentionPercent=2
Stripe__ConnectSplitSupportedCountries__0=ca

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

- `Stripe__ApplicationKey` e o `app_id` fixo enviado ao Stripe por este app. Neste projeto, o valor esperado e `codigo-judaico`.
- `Stripe__PaymentCoreAppName`, `Stripe__PaymentCoreTenantId`, `Stripe__PaymentCoreSellerId` e `Stripe__PaymentCoreSellerName` sao obrigatorios. Se algum estiver vazio, a API nao cria a Checkout Session.
- `Stripe__ConnectSplitSupportedCountries` lista os paises que podem continuar usando Stripe Connect split. Por padrao, o projeto considera `ca`.
- `Stripe__RequiredCurrency` deve ficar como `brl`. O backend valida a moeda do `Price` antes de abrir o checkout e ignora webhooks com `Price` fora dessa moeda.
- `Stripe__FirstAccess__PriceId` e obrigatorio para o checkout inicial de 21 dias por `R$ 29,90`.
- `Stripe__Renewal__PriceId` e obrigatorio se voce quiser vender a renovacao especial de `R$ 17,90`.
- `Stripe__Monthly__PriceId` e `Stripe__Annual__PriceId` sao os `Prices` recorrentes da conta da plataforma Stripe.
- `Stripe__Lifetime__PriceId` e obrigatorio se voce quiser habilitar o acesso vitalicio.
- `Stripe__FirstAccess__PlanName`, `Stripe__Renewal__PlanName`, `Stripe__Monthly__PlanName`, `Stripe__Annual__PlanName` e `Stripe__Lifetime__PlanName` sao usados como rotulo interno no app, metadata do checkout e descricao da compra.
- `Stripe__Monthly__PromotionCouponId` so e aplicado quando estiver preenchido.
- toda Checkout Session envia tambem `app_id`, `app_name`, `tenant_id`, `seller_id`, `seller_name` e `order_id` na `Session.Metadata`. Quando o modo e `payment`, a API duplica esses mesmos campos em `PaymentIntentData.Metadata`.
- para `connected accounts` BR, a API nao envia `transfer_data.destination`, `application_fee_amount`, `application_fee_percent`, `on_behalf_of` nem `Stripe-Account`; o pagamento vai 100% para a conta principal e o PaymentCore calcula o repasse.
- para `connected accounts` de paises suportados como `CA`, o fluxo atual de Stripe Connect split continua usando `transfer_data.destination` e taxa da plataforma.
- o PaymentCore depende dessa metadata para processar o webhook centralizado corretamente.
- `Resend__Enabled` deve ficar `true` no ambiente que realmente vai enviar os e-mails.
- `Resend__InboundWebhookSecret` e `Resend__InboundWebhookDisableVerification` ficam prontos para o momento em que voce adicionar um webhook inbound da Resend. O fluxo atual de liberacao de acesso usa apenas envio.
- se `Resend` estiver habilitado sem `ApiKey` ou `From`, a API vai liberar o acesso mesmo assim, mas registrara um aviso e nao conseguira enviar o e-mail.

## Metadata PaymentCore

Todo checkout enviado ao Stripe inclui os campos abaixo para o webhook centralizado:

- `app_id`: `codigo-judaico`
- `app_name`: configurado em `Stripe__PaymentCoreAppName`
- `tenant_id`: configurado em `Stripe__PaymentCoreTenantId`
- `seller_id`: configurado em `Stripe__PaymentCoreSellerId`
- `seller_name`: configurado em `Stripe__PaymentCoreSellerName`
- `order_id`: gerado internamente pela API para cada checkout antes da chamada ao Stripe

Esses campos acompanham tanto pagamentos com split quanto pagamentos sem split.

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

### Usar `appsettings.Production.json` em producao

O backend ja le `appsettings.Production.json` automaticamente quando o ambiente estiver com:

```text
ASPNETCORE_ENVIRONMENT=Production
```

Neste projeto, isso ja acontece no `docker-compose.easypanel.yml`.

Importante:

- `appsettings.Production.json` entra no publish do ASP.NET Core por padrao
- variaveis de ambiente com a mesma chave sobrescrevem o valor do arquivo
- por isso, se voce quiser que a connection string venha do arquivo, nao defina `ConnectionStrings__Postgres` no ambiente de producao

Exemplo de `backend/CodigoJudaico.Api/appsettings.Production.json`:

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=SEU_HOST;Port=5432;Database=SEU_BANCO;Username=SEU_USUARIO;Password=SUA_SENHA;SSL Mode=Require;Trust Server Certificate=true"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://www.codigomilenarjudaico.com"
    ]
  }
}
```

Fluxo para publicar usando esse arquivo:

1. preencha `backend/CodigoJudaico.Api/appsettings.Production.json`
2. confirme que `ASPNETCORE_ENVIRONMENT=Production` esta no deploy
3. nao configure `ConnectionStrings__Postgres` no Easypanel para esse servico
4. publique/rebuild a API

Se voce estiver usando deploy via Git, o arquivo precisa estar versionado no repositorio. Se estiver usando build local, basta ele existir no workspace no momento do `docker build` ou `dotnet publish`.

No servico `api`, se a string de conexao estiver no `appsettings.Production.json`, configure no Easypanel:

- `Stripe__SecretKey`
- `Stripe__WebhookSecret`
- `Stripe__ConnectedAccountId`
- `Stripe__FrontendBaseUrl`
- `Stripe__ApplicationKey`
- `Stripe__PaymentCoreAppName`
- `Stripe__PaymentCoreTenantId`
- `Stripe__PaymentCoreSellerId`
- `Stripe__PaymentCoreSellerName`
- `Stripe__ConnectSplitSupportedCountries__0`
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

### Aplicar migration no banco de producao a partir do seu computador

Se voce criou `backend/CodigoJudaico.Api/appsettings.Production.json` com a connection string de producao, pode rodar a migration localmente usando o ambiente `Production`.

No PowerShell, a partir da raiz do projeto:

```powershell
Set-Location D:\Study\codigo-judaico-app

dotnet tool restore

$env:ASPNETCORE_ENVIRONMENT = "Production"

dotnet dotnet-ef database update `
  --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj `
  --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj

Remove-Item Env:ASPNETCORE_ENVIRONMENT
```

Esse comando usa o mesmo `DbContext` da API, le o `appsettings.Production.json` e aplica todas as migrations pendentes no banco de producao.

Se quiser aplicar apenas uma migration especifica:

```powershell
Set-Location D:\Study\codigo-judaico-app

dotnet tool restore

$env:ASPNETCORE_ENVIRONMENT = "Production"

dotnet dotnet-ef database update 20260420000000_AddHasUsedRenewalOffer `
  --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj `
  --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj

Remove-Item Env:ASPNETCORE_ENVIRONMENT
```

Cuidados:

- o arquivo precisa estar em `backend/CodigoJudaico.Api/appsettings.Production.json`
- a connection string de producao precisa estar correta nele
- se existir `ConnectionStrings__Postgres` no seu shell, ela sobrescreve o arquivo
- confirme que o banco de producao aceita conexoes externas do seu IP
- faca backup do banco ou snapshot antes da migration

Se quiser validar quais migrations ja entraram:

```sql
SELECT "MigrationId"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId";
```

### Gerar script SQL da migration antes de aplicar

Se preferir revisar o SQL antes de executar no banco de producao:

```powershell
Set-Location D:\Study\codigo-judaico-app

dotnet tool restore

dotnet dotnet-ef migrations script --idempotent `
  --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj `
  --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj `
  --output .\migration-prod.sql
```

Depois, abra o arquivo `migration-prod.sql` e execute no banco de producao pelo cliente SQL da sua preferencia.

### Correcao rapida para o erro `HasUsedRenewalOffer does not exist`

Se o banco ficou fora de sincronia e a API ja esta esperando a coluna `HasUsedRenewalOffer`, voce pode corrigir imediatamente com:

```sql
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS "HasUsedRenewalOffer" boolean NOT NULL DEFAULT false;
```

Depois disso:

1. reinicie o servico `api`
2. rode a migration corretamente com `dotnet dotnet-ef database update`
3. confira o historico em `__EFMigrationsHistory`

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
