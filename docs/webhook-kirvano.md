# Compras pela Kirvano

A API recebe compras externas da Kirvano, identifica o comprador pelo e-mail e libera os direitos das ofertas cadastradas. O checkout Stripe existente continua disponivel. Esta integracao nao cria produtos ou checkouts dentro da sua conta Kirvano.

Documentacao oficial consultada:

- [Configurando Integracao via Webhook](https://help.kirvano.com/hc/central-de-ajuda/articles/1765385505-configurando-integracao-via-webhook)
- [Exemplos de requisicoes Webhook](https://help.kirvano.com/hc/central-de-ajuda/articles/1775656489-ex)

## Tipos de oferta

| `AccessPlan` | Tipo na Kirvano | Liberacao |
| --- | --- | --- |
| `primeiro-acesso` | Preco unico (`ONE_TIME`) | 21 dias a partir da data do pagamento, conforme `created_at` |
| `vitalicio` | Preco unico (`ONE_TIME`) | Acesso full sem expiracao |
| `mensal` | Assinatura (`RECURRING`, `MONTHLY`) | Periodo pago ate `plan.next_charge_date` |
| vazio, com `BookIds` | Preco unico (`ONE_TIME`) | Apenas os livros indicados |

Cada vinculo exige **ProductId e OfferId** da Kirvano. Um produto pode ter ofertas diferentes para 21 dias, full e mensalidade. Nomes e valores de produtos nao sao usados para conceder acesso. Uma oferta pode incluir acesso e livros; livros em order bumps tambem sao reconhecidos, desde que tenham seu proprio vinculo cadastrado.

IDs de livros aceitos:

- `metodo-judaico-riqueza`
- `7-gatilhos-dinheiro-desaparecer`
- `7-gatilhos-dinheiro-escapar`
- `identidade-nome-dinheiro`
- `prosperidade-geracoes`

Comprar `metodo-judaico-riqueza` tambem concede os dois livros de gatilhos, seguindo os bonus do catalogo atual. Para vender um pacote, configure varios `BookIds` na mesma oferta.

## Configuracao no backend

A integracao vem desabilitada. Configure no ambiente do servico da API; os IDs abaixo sao exemplos e devem ser substituidos pelos IDs reais:

```dotenv
Kirvano__Enabled=true
Kirvano__WebhookToken=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO
Kirvano__FrontendBaseUrl=https://SEU_DOMINIO_DO_APP
Kirvano__EventTimeZoneId=America/Sao_Paulo

Kirvano__Offers__0__ProductId=ID_PRODUTO_APP
Kirvano__Offers__0__OfferId=ID_OFERTA_21_DIAS
Kirvano__Offers__0__AccessPlan=primeiro-acesso

Kirvano__Offers__1__ProductId=ID_PRODUTO_APP
Kirvano__Offers__1__OfferId=ID_OFERTA_FULL
Kirvano__Offers__1__AccessPlan=vitalicio

Kirvano__Offers__2__ProductId=ID_PRODUTO_APP
Kirvano__Offers__2__OfferId=ID_OFERTA_MENSAL
Kirvano__Offers__2__AccessPlan=mensal

Kirvano__Offers__3__ProductId=ID_PRODUTO_LIVRO
Kirvano__Offers__3__OfferId=ID_OFERTA_LIVRO
Kirvano__Offers__3__BookIds__0=metodo-judaico-riqueza

Resend__Enabled=true
Resend__ApiKey=CHAVE_RESEND
Resend__From=REMETENTE_VERIFICADO
```

Para livros adicionais, acrescente ofertas com indices 4, 5 etc. O vinculo de livros pode ter `AccessPlan` vazio/omitido. Para adicionar um livro a uma oferta de acesso, use, por exemplo, `Kirvano__Offers__0__BookIds__0=identidade-nome-dinheiro`.

O token fica somente no backend e no cadastro do webhook. Nao use variaveis `VITE_*` para esse segredo. Gere-o, por exemplo, com `openssl rand -hex 32`. Evite registrar a URL completa do webhook nos logs do proxy, pois ela contem o token.

Datas sem offset da Kirvano (`yyyy-MM-dd HH:mm:ss`) usam `EventTimeZoneId`; o padrao assume America/Sao_Paulo. Confirme esse fuso em um evento real e ajuste se necessario. Datas ISO com offset explicito tambem sao aceitas. O app avalia expiracao por dia em UTC, seguindo a regra de acesso existente.

## Banco e publicacao

A migration `20261005002059_AddKirvanoPurchases` adiciona o historico das vendas, livros por venda e os campos de acesso Kirvano. Ela nao altera direitos Stripe. O inicializador da API aplica migrations ao iniciar; tambem e possivel aplicar antes de publicar:

```bash
dotnet ef database update --project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj --startup-project backend/CodigoJudaico.Api/CodigoJudaico.Api.csproj
```

Publique a API com a migration e as variaveis configuradas antes de cadastrar o webhook. O endereco precisa ser publico e HTTPS.

## Cadastro na Kirvano

No painel Kirvano, acesse **Integracoes > Webhooks > Criar Webhook**:

1. Nome: `Codigo Judaico - acesso e livros`.
2. URL: `https://SEU_DOMINIO_DA_API/api/payments/webhooks/kirvano?token=SEU_SEGREDO`.
3. Selecione os produtos de acesso e livros cadastrados no backend.
4. Selecione os eventos abaixo e salve.

| Evento | Tratamento |
| --- | --- |
| `SALE_APPROVED` | Confirma compra, exige `status=APPROVED` e libera as ofertas reconhecidas |
| `SUBSCRIPTION_RENEWED` | Atualiza a validade mensal conforme a proxima cobranca |
| `SUBSCRIPTION_CANCELED` | Mantem o periodo pago; nao estende a validade |
| `SUBSCRIPTION_EXPIRED` | Desativa o direito de acesso mensal daquela venda |
| `SALE_REFUNDED` | Retira acesso e livros daquela venda |
| `SALE_CHARGEBACK` | Retira acesso e livros daquela venda |

O campo opcional Token existe na documentacao Kirvano, mas ela nao especifica como o valor e transportado na requisicao. Por isso, o cadastro recomendado usa o parametro `token` na URL, que o endpoint valida explicitamente. A API tambem aceita o cabecalho `security-token`; use esse modo somente depois de confirmar o cabecalho em uma entrega real. Se usar a URL com token, o campo opcional Token do painel pode ficar vazio.

## Comportamento e validacao

- Compras repetidas nao criam usuarios, livros nem prazos duplicados. A chave persistente e `sale_id`.
- Aprovar novamente uma compra unica nao estende seus 21 dias. Compras antigas usam a data do pagamento, nao a data de entrega do webhook.
- Para mensalidade, `next_charge_date` valido e obrigatorio: sua ausencia nunca concede acesso permanente. Renovacoes da mesma venda so avancam o periodo; eventos antigos nao reduzem a validade.
- Reembolso e chargeback sao terminais para a venda, inclusive se chegarem antes da aprovacao ou com uma data anterior a outro evento. Outra compra valida preserva seus direitos.
- Cancelamento e atraso mensal nao retiram livros ja adquiridos; reembolso e chargeback retiram os livros vinculados a venda. Compras Stripe e outras compras Kirvano sao preservadas.
- Eventos pendentes, PIX/boleto gerados, pagamentos recusados e carrinhos abandonados nao liberam acesso.
- O comprador recebe um e-mail com login, link para criar/redefinir a senha (valido por 2 horas) e destino da compra. Uma senha existente e preservada. Compradores apenas de livros entram em `/livros`, sem acesso premium.
- Falha de e-mail preserva a compra e retorna HTTP 503. Reenviar a aprovacao tenta entregar o e-mail pendente; um envio confirmado nao e repetido. Com Resend desabilitado, o webhook aceita a compra sem envio; apos habilitar Resend, reenvie a aprovacao para entregar a notificacao.
- O acesso vendido aparece no painel administrativo; vendas de acesso e livros aparecem na exportacao de dados do usuario. A exclusao da conta limpa o acesso, desvincula as vendas e impede que novos eventos dessas mesmas vendas reativem a conta. Os arquivos PDF devem estar na pasta `Stripe__BooksPdfPath`, ja utilizada pelo endpoint de livros.

Use **Ver logs** na Kirvano para verificar o JSON e a resposta. Confirme uma compra de 21 dias, full, mensal e livro; reenvie uma aprovacao para verificar duplicidade; teste renovacao e reembolso. As ofertas podem ser vendidas nos checkouts externos da Kirvano sem alterar o checkout Stripe do app.

Os exemplos oficiais reutilizam o mesmo `sale_id` para renovacao/cancelamento; nao documentam formalmente a estabilidade desse ID. Confirme essa correlacao nos eventos reais da sua conta antes de ativar mensalidades em producao.

Respostas: 200 recebido/duplicado/ignorado, 400 payload invalido, 401 token invalido, 413 corpo acima de 256 KiB, 503 integracao desabilitada ou falha que permite nova tentativa. As tentativas simultaneas sao serializadas por venda e e-mail em PostgreSQL. A entrega do e-mail e confirmada no banco depois do envio; se houver uma queda nesse intervalo, uma nova tentativa pode repetir a mensagem.

## Testes locais

```bash
dotnet test backend/CodigoJudaico.Api.Tests/CodigoJudaico.Api.Tests.csproj
```

Os testes usam HTTP TestServer e SQLite temporario para exercitar o endpoint, armazenamento, login, definicao de senha e downloads, sem enviar e-mails reais. Os locks PostgreSQL e a aplicacao da migration devem ser validados no ambiente de homologacao com PostgreSQL.
