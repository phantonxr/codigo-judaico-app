# Compras pela Kiwify

O comprador paga no checkout da Kiwify. A Kiwify avisa a API por webhook, a API confirma a assinatura do aviso, identifica o comprador pelo e-mail e libera o acesso ou os livros do produto. O comprador recebe um e-mail com o link para criar a senha e entrar no app. O checkout Stripe do app e a integracao Kirvano continuam funcionando; esta integracao nao cria produtos nem checkouts na Kiwify.

Documentacao oficial consultada:

- [Receber e validar webhooks](https://docs.kiwify.com.br/api-reference/webhooks/receiving)
- [Eventos de assinatura](https://docs.kiwify.com.br/api-reference/webhooks/subscription-events)

## Produtos

Cada produto da Kiwify e vinculado a um tipo de acesso pelo `product_id`:

| `AccessPlan` | Tipo na Kiwify | Liberacao |
| --- | --- | --- |
| `primeiro-acesso` | Pagamento unico | 21 dias a partir da aprovacao (`approved_date`) |
| `vitalicio` | Pagamento unico | Acesso full sem expiracao |
| `mensal` | Assinatura mensal | Periodo pago ate `Subscription.customer_access.access_until` (ou `next_payment`) |
| vazio, com `BookIds` | Pagamento unico | Apenas os livros indicados |

Produto ja cadastrado em `backend/CodigoJudaico.Api/appsettings.json`:

| Produto Kiwify | Acesso |
| --- | --- |
| `0ccaf600-d71c-11f1-bb5c-51ca745ffb5e` | `vitalicio` |

O webhook da Kiwify informa o produto, mas nao documenta um identificador de oferta. Por isso, use **um produto por tipo de acesso** (por exemplo, um produto para 21 dias e outro para o vitalicio). Ofertas diferentes do mesmo produto liberam o mesmo acesso. Para assinaturas, `PlanId` (opcional) restringe o vinculo a um plano do produto (`Subscription.plan.id`); um vinculo sem `PlanId` vale para todas as compras do produto. Nomes e valores nao sao usados para conceder acesso.

IDs de livros aceitos: `metodo-judaico-riqueza`, `7-gatilhos-dinheiro-desaparecer`, `7-gatilhos-dinheiro-escapar`, `identidade-nome-dinheiro`, `prosperidade-geracoes`. Comprar `metodo-judaico-riqueza` tambem concede os dois livros de gatilhos.

## Configuracao no backend

A integracao vem desabilitada. Configure no ambiente do servico da API:

```dotenv
Kiwify__Enabled=true
Kiwify__WebhookToken=O_MESMO_TOKEN_CADASTRADO_NO_WEBHOOK_DA_KIWIFY
Kiwify__FrontendBaseUrl=https://SEU_DOMINIO_DO_APP

Resend__Enabled=true
Resend__ApiKey=CHAVE_RESEND
Resend__From=REMETENTE_VERIFICADO
```

O produto vitalicio ja vem de `appsettings.json` (indice 0). Para outros produtos, continue a lista pelas variaveis de ambiente a partir do indice 1:

```dotenv
Kiwify__Products__1__ProductId=ID_PRODUTO_21_DIAS
Kiwify__Products__1__AccessPlan=primeiro-acesso

Kiwify__Products__2__ProductId=ID_PRODUTO_MENSAL
Kiwify__Products__2__AccessPlan=mensal

Kiwify__Products__3__ProductId=ID_PRODUTO_LIVRO
Kiwify__Products__3__BookIds__0=metodo-judaico-riqueza
```

Para incluir um livro num produto de acesso, use, por exemplo, `Kiwify__Products__0__BookIds__0=identidade-nome-dinheiro`. A API nao inicia se a configuracao habilitada for invalida (token vazio, URL invalida, plano ou livro desconhecido, produto repetido).

O token fica somente no backend e no cadastro do webhook; nao use variaveis `VITE_*` para ele. Gere um valor longo e aleatorio, por exemplo com `openssl rand -hex 32`. Sem token, a assinatura da Kiwify nao prova nada.

Nenhuma migration nova e necessaria: as vendas Kiwify ficam na mesma tabela das vendas Kirvano (`kirvano_sales`), com o prefixo `kiwify:` no identificador. O acesso de todas as compras externas do comprador e combinado: por exemplo, um reembolso de 21 dias nao retira um vitalicio comprado em outra venda.

## Cadastro na Kiwify

No painel da Kiwify, acesse **Apps > Webhooks > Criar webhook**:

1. Nome: `Codigo Judaico - acesso e livros`.
2. URL: `https://SEU_DOMINIO_DA_API/api/payments/webhooks/kiwify` (publica, HTTPS, sem redirecionamento).
3. Token: o mesmo valor de `Kiwify__WebhookToken`.
4. Produtos: os produtos cadastrados no backend.
5. Eventos (gatilhos): compra aprovada, compra reembolsada, chargeback, assinatura renovada, assinatura cancelada e assinatura atrasada.

A Kiwify acrescenta `?signature=` a URL: um HMAC-SHA1 do corpo da requisicao com o token. A API recusa com 401 qualquer entrega sem assinatura valida.

| Evento (`webhook_event_type`) | Tratamento |
| --- | --- |
| `order_approved` | Exige `order_status=paid` e libera o produto reconhecido |
| `subscription_renewed` | Avanca a validade mensal ate o novo `access_until` |
| `subscription_canceled` | Mantem o periodo pago; nao estende a validade. Se vier com `order_status` `refunded` ou `chargedback`, vale como reembolso/chargeback |
| `subscription_late` | Ignorado: o periodo pago continua valendo e acaba sozinho |
| `order_refunded` | Retira acesso e livros daquela venda |
| `chargeback` | Retira acesso e livros daquela venda |
| `pix_created`, `billet_created`, `order_rejected` | Ignorados; nunca liberam acesso |

## Comportamento

- Uma assinatura e uma unica venda (`kiwify:sub:{subscription_id}`): cada renovacao traz um `order_id` novo, mas o mesmo `subscription_id`. Compras unicas usam `kiwify:order:{order_id}`.
- Entregas repetidas nao criam usuarios, livros nem prazos duplicados. Reenviar uma aprovacao nao estende os 21 dias.
- As datas na raiz do payload (`approved_date`, `updated_at`) sao horario de Brasilia (`yyyy-MM-dd HH:mm`); as de `Subscription` sao UTC. O fuso pode ser trocado em `Kiwify__EventTimeZoneId`.
- Uma mensalidade aprovada sem o bloco `Subscription` vale um mes a partir da aprovacao; a renovacao seguinte corrige a validade.
- Reembolso e chargeback sao definitivos para a venda: entregas posteriores da mesma venda nao a reativam. Outras compras do comprador (Kiwify, Kirvano ou Stripe) sao preservadas.
- O comprador recebe um e-mail com login, link para criar/redefinir a senha (valido por 2 horas) e o destino da compra. Uma senha existente e preservada. Compradores apenas de livros entram em `/livros`.
- Falha de e-mail preserva a compra e retorna 503; a Kiwify tenta de novo (e e possivel reenviar em **Ver logs**). Um envio confirmado nao e repetido.
- Exclusao de conta, painel administrativo e exportacao de dados tratam as vendas Kiwify como as da Kirvano.

Respostas: 200 recebido/duplicado/ignorado, 400 payload invalido, 401 assinatura invalida, 413 corpo acima de 256 KiB, 503 integracao desabilitada ou falha que permite nova tentativa.

## Troca do token

1. Coloque o token atual em `Kiwify__PreviousWebhookToken` e o novo em `Kiwify__WebhookToken`; publique.
2. Troque o token no webhook da Kiwify.
3. Depois de um dia (tempo das novas tentativas da Kiwify), remova `Kiwify__PreviousWebhookToken`.

## Validacao

A Kiwify nao tem ambiente de testes. Use **Testar Webhook** para conferir a assinatura (o produto ficticio retorna `ignored`) e confira em **Ver logs** o JSON e a resposta. Na primeira venda real, confirme em **Ver logs** os campos `Product.product_id`, `Customer.email` e `approved_date`, e verifique o acesso do comprador no painel administrativo.

```bash
dotnet test backend/CodigoJudaico.Api.Tests/CodigoJudaico.Api.Tests.csproj
```

Os testes de `KiwifyWebhookTests` assinam cada payload como a Kiwify (incluindo o vetor de teste oficial) e exercitam o endpoint com SQLite temporario, sem enviar e-mails reais.
