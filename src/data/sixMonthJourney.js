/**
 * Programa Macro 6 Meses de Construcao Patrimonial
 * 180 dias concretos organizados em 6 meses tematicos.
 *
 * Baseado em: behavioral finance, mental budgeting, financial mindfulness,
 * automatic saving systems, future orientation, emergency funds, self control.
 */

// ── Estrutura dos 6 meses ────────────────────────────────────

export const MONTH_PLAN = [
  {
    month: 1,
    title: 'Fundacao Financeira',
    subtitle: 'Rastreie cada centavo, organize sua base e elimine desperdicios.',
    pillars: ['orcamento consciente', 'rastreamento de gastos', 'corte de desperdicios', 'reserva inicial', 'revisao de assinaturas', 'gatilhos emocionais'],
    badges: [
      { id: 'primeiro_orcamento', label: 'Primeiro Orcamento', day: 7 },
      { id: 'reserva_iniciada', label: 'Reserva Iniciada', day: 25 },
    ],
  },
  {
    month: 2,
    title: 'Blindagem Financeira',
    subtitle: 'Fundo de emergencia, quitacao de dividas e protecao familiar.',
    pillars: ['fundo de emergencia', 'renegociacao de dividas', 'eliminacao de juros', 'protecao familiar', 'rotina de caixa', 'disciplina de consumo'],
    badges: [
      { id: 'fundo_emergencia', label: 'Fundo de Emergencia', day: 45 },
      { id: 'divida_eliminada', label: 'Divida Renegociada', day: 55 },
    ],
  },
  {
    month: 3,
    title: 'Expansao de Receita',
    subtitle: 'Mapeie habilidades, crie renda paralela e monetize conhecimento.',
    pillars: ['mapeamento de habilidades', 'renda paralela', 'monetizacao de conhecimento', 'revisao semanal de receita', 'eliminacao de crencas limitantes'],
    badges: [
      { id: 'renda_extra', label: 'Primeira Renda Extra', day: 70 },
      { id: 'revisao_trimestral', label: 'Revisao Trimestral', day: 90 },
    ],
  },
  {
    month: 4,
    title: 'Construcao de Patrimonio',
    subtitle: 'Automatize investimentos, compre ativos e planeje longo prazo.',
    pillars: ['automacao de investimentos', 'metas de patrimonio', 'compra consciente de ativos', 'evitar bens passivos', 'planejamento de longo prazo'],
    badges: [
      { id: 'primeiro_investimento', label: 'Primeiro Investimento', day: 100 },
      { id: 'patrimonio_estruturado', label: 'Patrimonio Estruturado', day: 120 },
    ],
  },
  {
    month: 5,
    title: 'Consolidacao e Protecao',
    subtitle: 'Score financeiro, patrimonio liquido, diversificacao e protecao emocional.',
    pillars: ['revisao de progresso', 'score financeiro pessoal', 'patrimonio liquido', 'diversificacao prudente', 'protecao emocional do dinheiro'],
    badges: [
      { id: 'score_alto', label: 'Score Alto', day: 140 },
      { id: 'diversificacao', label: 'Carteira Diversificada', day: 150 },
    ],
  },
  {
    month: 6,
    title: 'Legado e Escala',
    subtitle: 'Plano familiar, metas 12 meses, expansao e revisao permanente.',
    pillars: ['plano familiar', 'metas 12 meses', 'expansao de renda', 'protecao juridica', 'legado', 'revisao trimestral permanente'],
    badges: [
      { id: 'legado_estruturado', label: 'Legado Estruturado', day: 170 },
      { id: 'jornada_completa', label: 'Jornada Completa!', day: 180 },
    ],
  },
]

// ── Atividades diarias por mes ───────────────────────────────

const DAILY_ACTIVITIES = {
  1: [
    { title: 'Registre todas as entradas do mes', manha: 'Abra sua conta bancaria e anote cada entrada dos ultimos 30 dias. Categorize: salario, freelance, rendimentos, outros.', tarde: 'Organize as entradas em uma planilha simples ou app de financas. Calcule o total liquido mensal.', noite: 'Reflita: voce sabe exatamente quanto ganha por mes? Anote 1 surpresa que encontrou.' },
    { title: 'Rastreie cada gasto de ontem', manha: 'Anote TODOS os gastos de ontem, do cafe ao transporte. Use app ou caderno.', tarde: 'Classifique cada gasto em: essencial, desejavel, desnecessario. Seja honesto.', noite: 'Calcule quanto gastou em coisas desnecessarias. Qual o impacto mensal disso?' },
    { title: 'Identifique seu maior vazamento', manha: 'Revise os extratos das ultimas 4 semanas. Encontre os 3 maiores gastos recorrentes nao essenciais.', tarde: 'Calcule quanto cada vazamento custa por ano. Ex: R$15/dia = R$5.475/ano. O numero assusta?', noite: 'Escolha 1 vazamento para eliminar esta semana. Anote seu compromisso.' },
    { title: 'Crie seu orcamento semanal', manha: 'Divida sua renda mensal por 4. Esse eh o limite semanal. Subtraia gastos fixos.', tarde: 'Distribua o saldo disponivel: alimentacao, transporte, lazer, reserva. Seja realista.', noite: 'Anote o orcamento. Coloque como lembrete no celular. Isso muda tudo.' },
    { title: 'Faca a limpeza de assinaturas', manha: 'Liste TODAS as assinaturas ativas: streaming, apps, academia, revistas, etc.', tarde: 'Cancele tudo que nao usa ha 30 dias. Negocie desconto no que ficar.', noite: 'Calcule a economia anual. Destine esse valor para sua reserva.' },
    { title: 'Registre seus gatilhos emocionais', manha: 'Pense nos ultimos 3 gastos por impulso. O que sentiu antes de comprar?', tarde: 'Identifique o padrao: estresse, tedio, ansiedade, validacao social? Anote.', noite: 'Crie 1 estrategia para cada gatilho. Ex: "Quando ansioso, vou caminhar em vez de comprar."' },
    { title: 'Revisao semanal #1', manha: 'Calcule quanto gastou esta semana vs. orcamento planejado.', tarde: 'Identifique o que funcionou e o que nao funcionou. Ajuste para semana seguinte.', noite: 'Celebre cada real economizado. Gratidao pelo progresso, por menor que seja.' },
    { title: 'Diferencie desejo de necessidade', manha: 'Antes de qualquer compra hoje, pergunte: "Preciso disso ou quero isso?"', tarde: 'Anote 3 momentos onde resistiu a um desejo. Como se sentiu depois?', noite: 'A regra das 48h: qualquer compra nao essencial espera 48 horas.' },
    { title: 'Mapeie gastos fixos e variaveis', manha: 'Liste todos os gastos fixos: aluguel, energia, agua, internet, seguros.', tarde: 'Liste gastos variaveis do mes. Qual categoria surpreende mais?', noite: 'Os fixos devem ser no maximo 50% da renda. Esta dentro? Se nao, planeje reduzir.' },
    { title: 'Calcule seu custo de vida real', manha: 'Some tudo: fixos + variaveis + imprevistos do ultimo mes.', tarde: 'Divida pelo numero de dias. Esse eh seu custo diario de vida. Assusta?', noite: 'Meta: reduzir custo diario em 10% este mes. Anote 3 formas concretas.' },
    { title: 'Implemente a regra 50-30-20', manha: 'Calcule 50% da renda (necessidades), 30% (desejos), 20% (reserva/dividas).', tarde: 'Compare com seus gastos reais. Onde esta o maior desequilibrio?', noite: 'Ajuste seu orcamento para se aproximar da regra. Progresso, nao perfeicao.' },
    { title: 'Corte 3 gastos desnecessarios', manha: 'Escolha 3 gastos que pode eliminar HOJE: delivery desnecessario, cafe caro, app pago.', tarde: 'Execute os 3 cortes. Sem enrolar. Acao imediata.', noite: 'Calcule a economia mensal e anual. Destine para reserva.' },
    { title: 'Organize documentos financeiros', manha: 'Reuna: contracheques, faturas, extratos, contratos, apolices.', tarde: 'Digitalize e organize em pastas: renda, gastos, dividas, investimentos.', noite: 'Ter tudo organizado reduz ansiedade. Voce agora tem controle.' },
    { title: 'Revisao semanal #2', manha: 'Compare gastos da semana 2 com semana 1. Melhorou?', tarde: 'Ajuste orcamento baseado nos aprendizados. Refine as categorias.', noite: 'Anote 1 vitoria financeira da semana. Pequenas vitorias importam.' },
    { title: 'Negocie uma conta fixa', manha: 'Escolha 1 conta fixa: internet, celular, seguro. Pesquise alternativas.', tarde: 'Ligue e negocie desconto ou troque de plano. A maioria aceita reduzir.', noite: 'Anote a economia conquistada. Multiplique por 12 para ver o impacto anual.' },
    { title: 'Elimine o gasto fantasma', manha: 'Gasto fantasma: aquele que voce nem percebe. Revise cobranças no cartao.', tarde: 'Cancele cobranças que nao reconhece. Questione taxas bancarias.', noite: 'Cada real recuperado eh um real investido em voce.' },
    { title: 'Planeje compras da semana', manha: 'Faca lista de compras ANTES de ir ao mercado. Sem desvios.', tarde: 'No mercado: siga a lista. Sem improvisos. Compare precos.', noite: 'Quanto economizou vs. semana anterior? Anote.' },
    { title: 'Dia de reflexao financeira', manha: 'Qual sua relacao emocional com dinheiro? Escreva 1 pagina sincera.', tarde: 'Identifique 1 crenca sobre dinheiro herdada da familia que te limita.', noite: 'Reescreva essa crenca de forma positiva. Repita para si mesmo.' },
    { title: 'Calcule patrimonio liquido', manha: 'Some tudo que possui: saldo em conta, investimentos, bens. Esse eh o ativo.', tarde: 'Some todas as dividas: cartao, emprestimo, financiamento. Esse eh o passivo.', noite: 'Ativo - Passivo = Patrimonio Liquido. Anote. Esse numero vai crescer.' },
    { title: 'Inicie sua reserva de emergencia', manha: 'Abra uma conta separada (poupanca ou CDB) so para emergencia.', tarde: 'Transfira o primeiro valor, mesmo que seja R$50. O habito importa mais que o valor.', noite: 'Programe transferencia automatica semanal. Comece pequeno, mas comece.' },
    { title: 'Revisao semanal #3', manha: 'Avalie: seu orcamento esta sendo cumprido? Onde falhou?', tarde: 'Ajuste. Flexibilidade eh inteligencia, nao fraqueza.', noite: 'Voce ja acumula 3 semanas de disciplina. Celebre conscientemente.' },
    { title: 'Automatize pagamentos essenciais', manha: 'Configure debito automatico para: aluguel, energia, agua, internet.', tarde: 'Agende transferencia automatica semanal para reserva de emergencia.', noite: 'Automacao remove decisao. Menos decidir = menos chance de falhar.' },
    { title: 'Revise habitos de consumo', manha: 'Nos ultimos 21 dias, qual foi seu maior gasto por impulso?', tarde: 'Crie uma barreira: delete apps de compra, desinscreva de newsletters de ofertas.', noite: 'Ambiente importa. Torne dificil gastar e facil poupar.' },
    { title: 'Planeje o proximo mes', manha: 'Baseado neste mes, projete receitas e gastos do mes 2.', tarde: 'Defina 3 metas financeiras concretas para o proximo mes. Escreva.', noite: 'O mes 2 sera sobre blindagem. Voce esta preparado.' },
    { title: 'Dia de gratidao financeira', manha: 'Liste 5 coisas financeiras pelas quais eh grato. Teto, comida, saude.', tarde: 'Gratidao muda o foco de escassez para abundancia. Pratique.', noite: 'Envie uma mensagem de agradecimento para alguem que te ajudou financeiramente.' },
    { title: 'Fortaleca sua reserva', manha: 'Verifique o saldo da reserva de emergencia. Quanto ja acumulou?', tarde: 'Encontre R$30 extras para transferir hoje. Corte 1 gasto.', noite: 'Meta mes 1: 1 semana de despesas na reserva. Esta no caminho?' },
    { title: 'Elimine 1 tentacao recorrente', manha: 'Qual gasto por impulso se repete toda semana? Delivery? Cafe? App?', tarde: 'Substitua por alternativa gratuita ou mais barata. Cozinhe, prepare cafe em casa.', noite: 'A disciplina de HOJE define o patrimonio de AMANHA.' },
    { title: 'Revisao semanal #4', manha: 'Revise o mes inteiro. Quanto gastou? Quanto economizou? Quanto reservou?', tarde: 'Compare seu patrimonio liquido: inicio vs. fim do mes. Cresceu?', noite: 'Voce completou o Mes 1. Fundacao criada. Isso eh raro e poderoso.' },
    { title: 'Fechamento do Mes 1', manha: 'Calcule: total economizado, reserva acumulada, gastos eliminados.', tarde: 'Documente 3 maiores aprendizados do mes. Escreva com detalhes.', noite: 'Celebre! Voce construiu sua fundacao financeira. O alicerce mais importante.' },
    { title: 'Transicao para o Mes 2', manha: 'Revise o plano do Mes 2: Blindagem Financeira. Leia os objetivos.', tarde: 'Liste suas dividas atuais com valores e juros. Sem medo, com coragem.', noite: 'Amanha comeca a blindagem. Voce vai proteger o que construiu.' },
  ],
  2: [
    { title: 'Levantamento completo de dividas', manha: 'Liste TODAS as dividas: cartao, emprestimo, cheque especial, financiamento, parcelamentos.', tarde: 'Para cada divida anote: valor total, juros mensais, parcelas restantes, credor.', noite: 'Calcule o total da divida. Duro, mas necessario. Conhecimento eh poder.' },
    { title: 'Priorize dividas por juros', manha: 'Ordene dividas da maior taxa de juros para a menor.', tarde: 'A bola de neve: pague o minimo em todas, e o maximo possivel na de maior juros.', noite: 'Anote o plano de quitacao. Defina prazo para cada divida.' },
    { title: 'Renegocie a divida #1', manha: 'Ligue para o credor da maior divida. Peca reducao de juros ou quitacao com desconto.', tarde: 'Anote a proposta. Compare com seu orcamento. Pode pagar a vista com desconto?', noite: 'Toda negociacao eh valida. 10% de desconto em R$5.000 = R$500 livre.' },
    { title: 'Elimine o cheque especial', manha: 'Se usa cheque especial, ligue para o banco e peca para desativar.', tarde: 'Calcule quanto ja pagou de juros de cheque especial. Assustador, ne?', noite: 'Cheque especial eh a armadilha mais cara. Eliminar eh prioridade maxima.' },
    { title: 'Estruture o fundo de emergencia', manha: 'Meta: 3 meses de despesas fixas na reserva. Calcule o valor alvo.', tarde: 'Defina quanto vai poupar por semana para atingir a meta em 4 meses.', noite: 'Configure transferencia automatica semanal para o fundo.' },
    { title: 'Renegocie a divida #2', manha: 'Ligue para o segundo credor. Repita o processo de negociacao.', tarde: 'Tente consolidar dividas em uma so com juros menores.', noite: 'Cada divida renegociada eh um peso a menos. Registre o progresso.' },
    { title: 'Revisao semanal #5', manha: 'Saldo da reserva vs. meta. Dividas renegociadas com sucesso? Progresso.', tarde: 'Ajuste orcamento para acomodar pagamentos de dividas renegociadas.', noite: 'Voce esta se blindando. Isso exige coragem. Reconheca.' },
    { title: 'Proteja sua familia', manha: 'Voce tem seguro de vida? Seguro saude? Pesquise opcoes acessiveis.', tarde: 'Converse com sua familia sobre protecao financeira. Quem depende de voce?', noite: 'Protecao nao eh gasto, eh investimento na seguranca de quem voce ama.' },
    { title: 'Crie rotina de caixa diaria', manha: 'Todo dia, 5 minutos: verifica saldo, registra gastos, confere orcamento.', tarde: 'Use app ou planilha. Consistencia vence perfeicao.', noite: '5 minutos por dia = controle total. Nao pule.' },
    { title: 'Discipline o cartao de credito', manha: 'Regra: so use cartao para compras planejadas e que pode pagar a vista.', tarde: 'Se a fatura eh maior que 30% da renda, reduza drasticamente.', noite: 'Cartao nao eh extensao da renda. Eh ferramenta. Use com disciplina.' },
    { title: 'Elimine parcelamentos longos', manha: 'Liste todos os parcelamentos ativos. Quantos meses faltam para cada?', tarde: 'Tente quitar antecipado os de maior valor com desconto.', noite: 'Cada parcelamento quitado libera fluxo de caixa para investir.' },
    { title: 'Renegocie contratos fixos', manha: 'Revise: aluguel, plano de saude, seguro do carro, academia.', tarde: 'Ligue ou visite: peca desconto, troque de plano, compare concorrentes.', noite: 'Economia em fixos eh permanente. R$100/mes = R$1.200/ano.' },
    { title: 'Crie o colchao anti-recaida', manha: 'Separe R$200 em especie e guarde em local seguro. Esse eh o anti-recaida.', tarde: 'Quando sentir urgencia de gastar por impulso, esse valor "absorve" o choque.', noite: 'Ter dinheiro fisico de emergencia reduz ansiedade emocional com gastos.' },
    { title: 'Revisao semanal #6', manha: 'Dividas restantes vs. inicio do mes. Quanto ja quitou?', tarde: 'Reserva: esta crescendo? Quanto falta para 1 mes de despesas?', noite: 'Persistencia eh a chave. Continue mesmo quando for dificil.' },
    { title: 'Audite taxas bancarias', manha: 'Revise: taxa de manutencao, TED, DOC, anuidade de cartao, seguros do banco.', tarde: 'Cancele tudo que nao usa. Negocie anuidade zero ou troque de banco.', noite: 'Bancos digitais geralmente nao cobram taxas. Considere migrar.' },
    { title: 'Dialogo familiar sobre dinheiro', manha: 'Escolha 1 hora para conversa financeira com conjuge ou familia.', tarde: 'Compartilhe: orcamento, dividas, metas. Transparencia fortalece.', noite: 'Financas familiares alinhadas multiplicam resultados.' },
    { title: 'Protecao contra fraudes', manha: 'Ative notificacoes de cada transacao no banco e cartao.', tarde: 'Revise senhas financeiras. Use senhas fortes e unicas.', noite: 'Monitore seu CPF. Consulte Serasa/SPC. Prevencao eh protecao.' },
    { title: 'Automatize o pagamento de dividas', manha: 'Configure debito automatico para parcelas de dividas renegociadas.', tarde: 'Automatizar elimina o risco de esquecer e pagar juros por atraso.', noite: 'Revisao: todas as dividas tem pagamento automatico? Se nao, configure.' },
    { title: 'Calcule juros ja pagos na vida', manha: 'Some todos os juros pagos nos ultimos 12 meses: cartao, emprestimo, cheque especial.', tarde: 'Esse valor PODERIA estar na sua reserva. Deixe esse numero te motivar.', noite: 'De hoje em diante: zero juros. Essa eh a meta de blindagem.' },
    { title: 'Fortaleca a reserva', manha: 'Quanto tem na reserva agora? Faca transferencia extra hoje.', tarde: 'Venda algo que nao usa ha 6 meses. Destine para reserva.', noite: 'Cada real na reserva eh um dia de liberdade.' },
    { title: 'Revisao semanal #7', manha: 'Balanco do mes: dividas eliminadas, reserva acumulada, contratos renegociados.', tarde: 'Score de disciplina: de 0 a 10, como foi sua semana? O que melhorar?', noite: 'Voce esta mais forte financeiramente do que ha 7 semanas. Reconheca.' },
    { title: 'Crie meta de patrimonio mensal', manha: 'Defina: quanto quer ter de patrimonio liquido ao final do mes 3?', tarde: 'Quebre em metas semanais. Metas pequenas sao mais faceis de alcancar.', noite: 'Escreva a meta em lugar visivel. Visualizacao gera motivacao.' },
    { title: 'Discipline gastos sociais', manha: 'Gastos sociais: jantares, presentes, festas. Quanto gasta por mes?', tarde: 'Defina limite mensal para gastos sociais. Use envelope de dinheiro.', noite: 'Socializar nao precisa ser caro. Criatividade > ostentacao.' },
    { title: 'Elimine o ultimo juros ativo', manha: 'Qual divida ainda tem juros ativo? Planeje quitacao acelerada.', tarde: 'Realoque todo recurso possivel para liquidar. Sacrifique temporariamente.', noite: 'Zero juros = fundacao blindada. Voce esta quase la.' },
    { title: 'Prepare-se para expansao', manha: 'Mes 3 sera sobre aumentar renda. Liste 3 habilidades que voce tem.', tarde: 'Pesquise: quanto essas habilidades valem no mercado? Freelance? Consultoria?', noite: 'Blindagem completa permite crescer com seguranca. Voce esta pronto.' },
    { title: 'Revisao de protecao familiar', manha: 'Sua familia sabe onde esta sua reserva? Tem acesso em emergencia?', tarde: 'Crie um documento simples: senhas, contas, contatos importantes.', noite: 'Protecao real inclui transparencia e organizacao familiar.' },
    { title: 'Habito de caixa consolidado', manha: 'Ja faz 5 min diarios de revisao? Esta automatizado? Se nao, reforce.', tarde: 'Revise a semana: cada gasto foi consciente? Quantos foram automaticos?', noite: 'Consciencia financeira eh musculo. Quanto mais usa, mais forte fica.' },
    { title: 'Revisao semanal #8 e fechamento', manha: 'Balanco do Mes 2: dividas eliminadas, juros zerados, reserva crescente.', tarde: 'Compare patrimonio liquido mes 1 vs. mes 2. Cresceu? Quanto?', noite: 'Mes 2 completo. Voce esta blindado. Isso eh raro e valioso.' },
    { title: 'Fechamento do Mes 2', manha: 'Documente: total de dividas quitadas, economia em juros, fundo de emergencia atual.', tarde: 'Liste 3 conquistas do mes. Celebre cada uma.', noite: 'Voce construiu blindagem. Agora vem a expansao.' },
    { title: 'Transicao para o Mes 3', manha: 'Leia os objetivos do Mes 3: Expansao de Receita.', tarde: 'Liste todas as suas habilidades, talentos e experiencias profissionais.', noite: 'Amanha comecaremos a transformar conhecimento em renda. Prepare-se.' },
  ],
  3: [
    { title: 'Mapeie suas habilidades monetizaveis', manha: 'Liste tudo que sabe fazer: cozinhar, ensinar, escrever, programar, organizar, vender.', tarde: 'Pergunte a 3 pessoas: "O que voce pediria minha ajuda para fazer?"', noite: 'Cruze as duas listas. A intersecao eh onde esta sua renda extra.' },
    { title: 'Pesquise demanda real', manha: 'Busque no Google, Instagram e LinkedIn: pessoas estao pagando por isso?', tarde: 'Anote 5 formas de monetizar sua habilidade principal. Freelance, aula, servico, produto digital.', noite: 'Demanda > Paixao. Faca o que pagam, nao so o que gosta.' },
    { title: 'Defina sua primeira oferta', manha: 'Crie 1 oferta simples: servico ou produto, publico-alvo, preco.', tarde: 'Escreva a oferta em 1 paragrafo. Simples e direto.', noite: 'Voce nao precisa de site. WhatsApp + descricao clara = negocio.' },
    { title: 'Faca sua primeira venda', manha: 'Envie sua oferta para 10 pessoas conhecidas. Sem vergonha. Acao!', tarde: 'Se recusarem, pergunte: "O que faria voce querer isso?" Feedback eh ouro.', noite: 'Mesmo sem venda hoje, voce agiu. Acao > Planejamento infinito.' },
    { title: 'Revisao de receita semanal', manha: 'Calcule toda receita da semana. Houve entrada extra? De onde?', tarde: 'Projeto: quanto pode gerar por mes com renda extra? Seja realista.', noite: 'Toda receita extra vai para: 50% acelerar dividas/reserva, 50% reinvestir.' },
    { title: 'Elimine crenca limitante #1', manha: 'Crenca: "Dinheiro eh sujo" ou "Rico eh desonesto". Voce acredita nisso?', tarde: 'Contraprova: liste 3 pessoas prosperas e honestas que conhece.', noite: 'Reescreva a crenca: "Dinheiro eh ferramenta de liberdade e bem."' },
    { title: 'Revisao semanal #9', manha: 'Como esta a renda extra? Fez vendas? Recebeu feedback?', tarde: 'Ajuste a oferta baseado no feedback real do mercado.', noite: 'Resiliencia: renda extra exige persistencia. Continue.' },
    { title: 'Crie rotina de prospeccao', manha: 'Dedique 30 min/dia para encontrar novos clientes ou oportunidades.', tarde: 'Use: LinkedIn, Instagram, grupos de WhatsApp, indicacoes.', noite: 'Prospeccao eh como exercicio: so funciona se fizer todo dia.' },
    { title: 'Monetize seu conhecimento', manha: 'O que voce sabe que outros querem aprender? Faca uma lista.', tarde: 'Crie 1 mini-aula ou tutorial gratuito. Poste em rede social ou envie para conhecidos.', noite: 'Dar valor de graca atrai clientes pagantes. Estrategia, nao caridade.' },
    { title: 'Diversifique fontes de renda', manha: 'Voce depende de 1 fonte de renda? Isso eh risco. Liste alternativas.', tarde: 'Pesquise: freelance, aulas, consultoria, venda de produtos, afiliados.', noite: 'Meta: pelo menos 2 fontes de renda ate o final deste mes.' },
    { title: 'Invista em voce mesmo', manha: 'Qual habilidade, se desenvolvida, dobraria sua renda em 1 ano?', tarde: 'Encontre 1 curso gratuito ou acessivel sobre essa habilidade. Comece hoje.', noite: 'Investir em conhecimento eh o investimento de maior retorno.' },
    { title: 'Calcule o valor da sua hora', manha: 'Renda mensal / horas trabalhadas = valor da sua hora.', tarde: 'Voce esta vendendo sua hora por um preco justo? Se nao, como aumentar?', noite: 'Aumentar o valor da hora eh mais eficiente que trabalhar mais horas.' },
    { title: 'Elimine crenca limitante #2', manha: 'Crenca: "Nao mereço prosperar" ou "Sou ruim com dinheiro". Te reconhece?', tarde: 'Evidencias contra: liste 3 decisoes financeiras boas que ja tomou.', noite: 'Reescreva: "Estou aprendendo e melhorando minha relacao com dinheiro."' },
    { title: 'Revisao semanal #10', manha: 'Renda extra acumulada este mes. Novos clientes? Evolucao?', tarde: 'Refinamento: como escalar sem trabalhar mais horas?', noite: 'Crescimento sustentavel > crescimento rapido e esgotante.' },
    { title: 'Crie seu sistema de preco', manha: 'Pesquise quanto cobram profissionais similares na sua area.', tarde: 'Defina 3 niveis de preco: basico, intermediario, premium.', noite: 'Preco comunica valor. Nao cobre barato. Cobre justo.' },
    { title: 'Construa reputacao', manha: 'Peca depoimento para cada cliente atendido. Feedback escrito eh prova social.', tarde: 'Poste os depoimentos em rede social (com permissao). Credibilidade vende.', noite: 'Reputacao se constroi atendimento por atendimento.' },
    { title: 'Otimize seu tempo', manha: 'Onde perde mais tempo no dia? Rede social? Reunioes desnecessarias?', tarde: 'Elimine 1 hora de desperdicio e use para gerar renda.', noite: 'Tempo eh o recurso mais escasso. Use com intencao.' },
    { title: 'Revisao financeira semanal', manha: 'Receita total: salario + extras. Como esta o balanco?', tarde: 'Reserva e investimentos estao crescendo? A renda extra esta ajudando?', noite: 'Cada semana conta. Consistencia gera transformacao.' },
    { title: 'Negocie um aumento ou nova proposta', manha: 'Se eh CLT: prepare argumentos para pedir aumento. Resultados, entregas, comparacao salarial.', tarde: 'Se eh autonomo: revise seus precos. Esta na hora de aumentar?', noite: 'Pedir mais pelo seu trabalho eh legitimo e necessario.' },
    { title: 'Crie renda passiva', manha: 'Pesquise formas de renda passiva: e-book, curso online, template, planilha.', tarde: 'Escolha 1 produto digital simples para criar este mes.', noite: 'Renda passiva = trabalhe uma vez, receba muitas.' },
    { title: 'Revisao semanal #11', manha: 'Balanco: receita extra, renda passiva em construcao, habilidades desenvolvidas.', tarde: 'Ajuste estrategia para as ultimas semanas do mes.', noite: 'Voce esta expandindo. Isso exige ousadia. Continue.' },
    { title: 'Automatize a prospeccao', manha: 'Crie template de mensagem para oferecer seus servicos. Salve.', tarde: 'Envie para 5 novos contatos por dia. Automatize com lembrete no celular.', noite: 'Prospeccao automatizada = renda previsivel.' },
    { title: 'Registre tudo financeiramente', manha: 'Cada real de renda extra deve ser registrado. Planilha separada.', tarde: 'Calcule: lucro liquido apos custos. Esse eh o numero real.', noite: 'Gestao financeira do negocio eh tao importante quanto do pessoal.' },
    { title: 'Revisao trimestral completa', manha: 'Balanco dos 3 meses: patrimonio liquido cresceu? Dividas reduziram? Renda aumentou?', tarde: 'Defina 3 metas para o proximo trimestre. Concretas e mensuraveis.', noite: 'Marco trimestral atingido. Voce esta no caminho da prosperidade.' },
    { title: 'Elimine a ultima crenca limitante', manha: 'Qual crenca ainda sabota seu crescimento? Medo? Culpa? Vergonha?', tarde: 'Escreva: "Eu mereço prosperar. Meu crescimento ajuda minha familia."', noite: 'Repita diariamente. Mentalidade eh 80% do resultado financeiro.' },
    { title: 'Prepare entrada para investimentos', manha: 'Mes 4 sera sobre patrimonio. Voce ja tem sobra de caixa para investir?', tarde: 'Calcule: quanto pode investir por mes sem comprometer seguranca?', noite: 'Investir eh o proximo nivel. Voce esta pronto.' },
    { title: 'Revisao semanal #12', manha: 'Fechamento mes 3: renda extra total, clientes atendidos, habilidades desenvolvidas.', tarde: 'Documentar: o que funcionou, o que nao funcionou, o que escalar.', noite: 'Mes 3 completo. De consumidor voce se tornou produtor de valor.' },
    { title: 'Fechamento do Mes 3', manha: 'Documente: renda extra acumulada, produto digital criado (se aplicavel), patrimonio atual.', tarde: 'Compare patrimonio mes 1 vs. mes 3. O crescimento eh visivel?', noite: 'Celebre! Voce gerou receita nova. Poucos chegam aqui.' },
    { title: 'Consolidacao de receita', manha: 'Organize: quanto vem de renda fixa, quanto de renda extra, quanto de passiva.', tarde: 'Projete: se mantiver essa renda por 12 meses, quanto tera?', noite: 'Projecao eh motivacao. Continue.' },
    { title: 'Transicao para o Mes 4', manha: 'Leia os objetivos do Mes 4: Construcao de Patrimonio.', tarde: 'Pesquise opcoes de investimento acessiveis: Tesouro Direto, CDB, fundos.', noite: 'Amanha comecaremos a fazer seu dinheiro trabalhar para voce.' },
  ],
  4: [
    { title: 'Entenda os tipos de investimento', manha: 'Pesquise: renda fixa (Tesouro, CDB, LCI) vs. renda variavel (acoes, FIIs, ETFs).', tarde: 'Para iniciantes: renda fixa eh mais segura. Comece por la.', noite: 'Anote: quanto rende cada opcao? Qual o prazo? Qual o risco?' },
    { title: 'Abra conta em corretora', manha: 'Escolha uma corretora com taxa zero: Rico, Clear, Nu Invest, Inter.', tarde: 'Abra a conta. Processo leva 15 min. Documentos: CPF e foto.', noite: 'Ter a conta aberta eh o primeiro passo. Amanha investimos.' },
    { title: 'Faca seu primeiro investimento', manha: 'Escolha 1 investimento simples: Tesouro Selic ou CDB de liquidez diaria.', tarde: 'Invista o valor definido. Mesmo R$100. O habito importa mais.', noite: 'Parabens! Voce eh investidor agora. Seu dinheiro comecou a trabalhar.' },
    { title: 'Automatize investimento mensal', manha: 'Configure aplicacao automatica mensal na corretora.', tarde: 'Defina o valor: pelo menos 10% da renda. Automatize para dia 5.', noite: 'Investimento automatico eh o segredo dos ricos. Eles nao pensam, fazem.' },
    { title: 'Defina metas de patrimonio', manha: 'Meta 6 meses: quanto quer ter investido? Seja especifico.', tarde: 'Meta 12 meses, 3 anos, 5 anos. Anote tudo.', noite: 'Metas escritas tem 42% mais chance de serem alcancadas.' },
    { title: 'Calcule juros compostos', manha: 'Use calculadora de juros compostos. Simule: R$500/mes por 10 anos a 12% a.a.', tarde: 'O resultado vai te surpreender. Tempo + consistencia = fortuna.', noite: 'Juros compostos: a oitava maravilha do mundo (Einstein).' },
    { title: 'Revisao semanal #13', manha: 'Investimentos: quanto ja esta aplicado? Esta no automatico?', tarde: 'Orcamento: os investimentos estao dentro do planejado?', noite: 'Continue. Patrimonio se constroi tijolo por tijolo.' },
    { title: 'Evite bens passivos', manha: 'Bem passivo: carro financiado, roupa de marca, eletronico novo sem necessidade.', tarde: 'Antes de comprar pergunte: "Isso gera renda ou consome renda?"', noite: 'Ricos compram ativos primeiro, bens depois. Imite esse padrao.' },
    { title: 'Estude 1 tipo de investimento', manha: 'Escolha: Tesouro IPCA, FIIs, ou ETFs. Pesquise por 30 min.', tarde: 'Anote: como funciona, riscos, rendimento medio, prazo ideal.', noite: 'Conhecimento financeiro eh o melhor seguro contra perdas.' },
    { title: 'Planeje compra de ativo', manha: 'Qual ativo quer comprar nos proximos 3 meses? Imóvel, fundo, acao?', tarde: 'Pesquise: preco atual, historico, perspectiva. Nao compre por impulso.', noite: 'Compra de ativo planejada > compra emocional. Sempre.' },
    { title: 'Diversifique investimentos', manha: 'Nao coloque tudo em 1 lugar. Distribua: renda fixa, variavel, reserva.', tarde: 'Regra simples para iniciantes: 60% renda fixa, 30% variavel, 10% reserva.', noite: 'Diversificacao protege contra riscos. Sabedoria milenar.' },
    { title: 'Revise custos de investimento', manha: 'Verifique: taxa de administracao, taxa de performance, IOF, IR.', tarde: 'Custos altos corroem rendimento. Prefira investimentos com taxas baixas.', noite: 'Cada 0.5% de taxa a menos = milhares a mais em 10 anos.' },
    { title: 'Patrimonio vs. Aparencia', manha: 'Reflexao: voce investe no que parece ou no que eh?', tarde: 'Patrimonio real eh invisivel. Saldo na conta, nao carro na garagem.', noite: 'A tradicao judaica ensina: construir em silencio, colher em abundancia.' },
    { title: 'Revisao semanal #14', manha: 'Portfolio: quanto cresceu? Novos investimentos feitos?', tarde: 'Rebalanceamento: esta na proporcao desejada?', noite: 'Paciencia eh a virtude do investidor. Resultados vem com tempo.' },
    { title: 'Proteja seu patrimonio', manha: 'Pesquise: seguro de vida, seguro residencial, previdencia privada.', tarde: 'Calcule: qual protecao sua familia precisa se voce nao puder trabalhar?', noite: 'Protecao nao eh pessimismo. Eh responsabilidade.' },
    { title: 'Planeje longo prazo', manha: 'Onde voce quer estar financeiramente em 5 anos? 10 anos? 20 anos?', tarde: 'Projete: se investir X por mes durante Y anos, quanto tera?', noite: 'Visao de longo prazo separa quem prospera de quem sobrevive.' },
    { title: 'Elimine gastos que nao geram valor', manha: 'Revise cada gasto do mes. Qual NAO contribui para saude, renda ou patrimonio?', tarde: 'Elimine ou reduza drasticamente. Realoque para investimentos.', noite: 'Cada real redirecionado eh um soldado trabalhando por voce.' },
    { title: 'Aumente o aporte mensal', manha: 'Revise: pode aumentar o investimento automatico em 10%?', tarde: 'Se a renda extra cresceu, aumente proporcionalmente os investimentos.', noite: 'Aumentos graduais sao imperceptiveis no dia, mas massivos no ano.' },
    { title: 'Estude o mercado', manha: 'Assine 1 newsletter financeira gratuita de qualidade.', tarde: 'Leia 1 artigo sobre economia hoje. Entenda o cenario.', noite: 'Investidor informado erra menos. Conhecimento eh escudo.' },
    { title: 'Construa mentalidade de dono', manha: 'Voce eh dono do seu patrimonio. Aja como gestor, nao como espectador.', tarde: 'Revise investimentos como um CEO revisa a empresa: com rigor e estrategia.', noite: 'Mentalidade de dono = responsabilidade total pelos resultados.' },
    { title: 'Revisao semanal #15', manha: 'Patrimonio liquido agora vs. inicio do mes 4. Evolucao?', tarde: 'Investimentos renderam? Quanto? Custos estao controlados?', noite: 'Voce esta construindo riqueza real. Continue.' },
    { title: 'Automatize tudo possivel', manha: 'Pagamentos, investimentos, transferencias: tudo no automatico.', tarde: 'Quanto menos decidir sobre dinheiro no dia, melhor sera o resultado.', noite: 'Automacao eh a arma secreta dos disciplinados.' },
    { title: 'Faca o balanco patrimonial completo', manha: 'Ativos: investimentos + reserva + bens. Passivos: dividas restantes.', tarde: 'Patrimonio liquido: Ativos - Passivos. Anote e compare com mes 1.', noite: 'O crescimento patrimonial ja eh visivel? Se sim, voce esta no caminho.' },
    { title: 'Planeje o proximo trimestre', manha: 'Metas financeiras para meses 5-6: consolidar, diversificar, proteger.', tarde: 'Defina 3 metas especificas e mensuraveis.', noite: 'Quem planeja prospera. Quem improvisa sobrevive.' },
    { title: 'Revisao de risco', manha: 'Seus investimentos estao adequados ao seu perfil de risco?', tarde: 'Se perde sono com quedas do mercado, esta arriscando demais. Ajuste.', noite: 'Investir bem eh dormir tranquilo. Se nao esta tranquilo, reduza risco.' },
    { title: 'Educacao financeira continua', manha: 'Escolha 1 livro sobre financas para ler este mes.', tarde: 'Recomendacoes: Pai Rico Pai Pobre, O Homem Mais Rico da Babilonia, Investidor Inteligente.', noite: 'Ler 10 paginas por dia = 30 livros por ano. Transformacao garantida.' },
    { title: 'Revisao semanal #16', manha: 'Fechamento mes 4. Patrimonio acumulado: quanto? Investimentos automatizados?', tarde: 'Documentar aprendizados: erros, acertos, ajustes necessarios.', noite: 'Mes 4 completo. Voce agora constroi patrimonio ativamente.' },
    { title: 'Fechamento do Mes 4', manha: 'Documente: total investido, rentabilidade, patrimonio liquido atualizado.', tarde: 'Compare: inicio da jornada vs. agora. A transformacao eh real?', noite: 'Celebre! 4 meses de construcao consistente. Pouquissimos fazem isso.' },
    { title: 'Consolide investimentos', manha: 'Revise: muitos investimentos pequenos? Simplifique e consolide.', tarde: 'Qualidade > Quantidade. Poucos investimentos bons > muitos mediocres.', noite: 'Simplicidade eh sofisticacao em financas.' },
    { title: 'Transicao para o Mes 5', manha: 'Leia objetivos do Mes 5: Consolidacao e Protecao.', tarde: 'Prepare-se: revisao profunda de tudo construido ate aqui.', noite: 'Os proximos 2 meses sao sobre solidificar e proteger.' },
  ],
  5: [
    { title: 'Revisao profunda de progresso', manha: 'Revise cada mes: 1-Fundacao, 2-Blindagem, 3-Receita, 4-Patrimonio. Evolucao?', tarde: 'Avalie de 0-10 cada pilar: orcamento, reserva, dividas, renda, investimentos.', noite: 'Identifique o pilar mais fraco. Ele sera o foco desta semana.' },
    { title: 'Calcule seu score financeiro pessoal', manha: 'Some: reserva (0-20pts) + zero dividas (0-20pts) + investindo (0-20pts) + renda extra (0-20pts) + disciplina (0-20pts).', tarde: 'Score acima de 60: voce esta excelente. Abaixo de 40: foque no pilar mais fraco.', noite: 'Anote o score. Vamos medi-lo novamente no final do mes.' },
    { title: 'Atualize patrimonio liquido', manha: 'Some todos os ativos: contas, investimentos, bens de valor.', tarde: 'Subtraia passivos. Patrimonio liquido atualizado.', noite: 'Compare: mes 1 vs. agora. O crescimento deve ser evidente.' },
    { title: 'Diversificacao prudente', manha: 'Sua carteira esta diversificada? Renda fixa, variavel, reserva?', tarde: 'Se nao, ajuste. Nao concentre mais de 30% em um unico ativo.', noite: 'Diversificacao eh a unica estrategia gratis que reduz risco.' },
    { title: 'Protecao emocional do dinheiro', manha: 'Como se sente com dinheiro hoje vs. dia 1? Mais calmo? Mais confiante?', tarde: 'Identifique: ainda tem ansiedade financeira? Em que momentos?', noite: 'Escreva: "Meu dinheiro esta seguro porque EU estou disciplinado."' },
    { title: 'Revisao de gastos automaticos', manha: 'Revise todos os debitos automaticos. Ainda fazem sentido?', tarde: 'Cancele o que nao usa mais. Otimize o que ficou.', noite: 'Automaticos esquecidos sao vazamentos silenciosos.' },
    { title: 'Revisao semanal #17', manha: 'Score financeiro: melhoria vs. inicio do mes?', tarde: 'Patrimonio cresceu? Diversificacao adequada?', noite: 'Consolidacao exige revisao constante. Nao relaxe.' },
    { title: 'Simule cenarios financeiros', manha: 'E se perder o emprego? Aguenta quantos meses com a reserva?', tarde: 'E se tiver gasto inesperado de R$5.000? Consegue absorver?', noite: 'Saude financeira = capacidade de absorver choques.' },
    { title: 'Otimize impostos', manha: 'Pesquise: existem investimentos com isencao de IR? LCI, LCA, previdencia.', tarde: 'Aloque parte dos investimentos em opcoes com beneficio fiscal.', noite: 'Imposto pago a menos eh rendimento a mais. Legalmente.' },
    { title: 'Revisao de seguros', manha: 'Seus seguros estao adequados? Vida, saude, residencial, auto.', tarde: 'Compare precos. Renegocie se possivel. Nao pague mais do que precisa.', noite: 'Seguro adequado = protecao sem excesso de custo.' },
    { title: 'Recalibre metas de patrimonio', manha: 'Metas do mes 4 foram alcancadas? Se sim, aumente 20%.', tarde: 'Se nao, identifique por que. Ajuste sem culpa.', noite: 'Metas sao guias, nao juizes. Flexibilidade eh inteligencia.' },
    { title: 'Fortaleca mentalidade de abundancia', manha: 'Reflexao: voce pensa em escassez ou abundancia? Qual seu padrao mental?', tarde: 'Exercicio: liste 10 formas que ja prosperou. Pequenas ou grandes.', noite: 'Abundancia eh estado mental que precede o estado financeiro.' },
    { title: 'Discipline gastos de lazer', manha: 'Quanto gasta em lazer por mes? Eh proporcional a renda?', tarde: 'Defina teto: 15% da renda para lazer. Sem culpa, com limite.', noite: 'Lazer eh necessario, mas controlado. Equilibrio sempre.' },
    { title: 'Revisao semanal #18', manha: 'Patrimonio, score, metas: tudo atualizado?', tarde: 'Gastos controlados? Automaticos funcionando?', noite: 'Disciplina no mes 5 define o resultado do mes 6.' },
    { title: 'Prepare-se para o legado', manha: 'O que voce quer deixar para sua familia? Financeiramente e moralmente?', tarde: 'Escreva uma carta de intencoes financeiras para seus filhos/familia.', noite: 'Legado comeca com intencao. Voce esta criando o seu.' },
    { title: 'Reavalie carreira e renda', manha: 'Sua renda principal esta crescendo? Tem perspectiva?', tarde: 'Se estagnada, planeje: capacitacao, mudanca, empreendedorismo?', noite: 'Renda eh o motor. Se o motor para, o patrimonio para.' },
    { title: 'Construa rede de apoio financeiro', manha: 'Voce tem com quem conversar sobre financas? Mentores, grupo, partner?', tarde: 'Se nao, procure: comunidades, grupos locais, mentoria gratuita.', noite: 'Ninguem prospera sozinho. Rede eh multiplicador.' },
    { title: 'Revisao emocional profunda', manha: 'Como esta sua relacao emocional com dinheiro agora? Ansiosa? Calma? Confiante?', tarde: 'Compare com o inicio: houve transformacao emocional alem da financeira?', noite: 'A maior riqueza eh paz com dinheiro. Voce esta conquistando isso.' },
    { title: 'Automatize analise mensal', manha: 'Crie planilha/template que preenche todo mes: receita, gasto, investimento, patrimonio.', tarde: 'Quanto mais automatica a analise, mais sustentavel o habito.', noite: 'Sistema > Forca de vontade. Sempre.' },
    { title: 'Invista em experiencias, nao em coisas', manha: 'Reflexao: nos ultimos 5 meses, o que trouxe mais felicidade: compras ou experiencias?', tarde: 'Redirecione gastos de coisas para experiencias significativas.', noite: 'Pesquisa mostra: experiencias geram mais felicidade que bens materiais.' },
    { title: 'Revisao semanal #19', manha: 'Consolidacao esta firme? Patrimonio protegido? Score melhorou?', tarde: 'Emocional esta equilibrado? Ansiedade financeira diminuiu?', noite: 'Voce esta se tornando uma pessoa diferente com dinheiro.' },
    { title: 'Reavalie seu estilo de vida', manha: 'Seu estilo de vida eh sustentavel? Gasta menos do que ganha consistentemente?', tarde: 'Lifestyle creep: renda subiu e gastos tambem? Cuidado. Mantenha gastos estaveis.', noite: 'O segredo: viva como ganhava antes do aumento. Invista a diferenca.' },
    { title: 'Construa resiliencia financeira', manha: 'Resiliencia: capacidade de absorver choques. Sua reserva eh suficiente?', tarde: 'Teste mental: se perdesse toda renda hoje, quanto tempo aguenta?', noite: 'Meta: 6 meses de reserva. Voce esta la? Se nao, continue construindo.' },
    { title: 'Revise fluxo de caixa completo', manha: 'Entradas vs. saidas dos ultimos 5 meses. Tendencia positiva?', tarde: 'Se o saldo cresce mes a mes, voce esta prosperando. Se oscila, ajuste.', noite: 'Fluxo de caixa positivo consistente eh a base de toda riqueza.' },
    { title: 'Prepare o plano familiar', manha: 'Mes 6 envolve familia. Prepare-se: quais metas familiares quer definir?', tarde: 'Protecao juridica: testamento, previdencia, seguro. Ja pensou nisso?', noite: 'Legado nao eh so dinheiro. Eh valores, habitos, sabedoria.' },
    { title: 'Revisao semanal #20', manha: 'Score financeiro atualizado. Cresceu desde o inicio do mes?', tarde: 'Todos os automaticos funcionando? Reserva, investimentos, pagamentos?', noite: 'Voce esta a caminho do ultimo mes. A jornada eh real.' },
    { title: 'Celebre o progresso', manha: 'Liste todas as conquistas dos 5 meses. TODAS. Das menores as maiores.', tarde: 'Compartilhe com alguem de confianca. Orgulho eh permitido.', noite: 'Gratidao pelo caminho percorrido. Voce eh diferente de 5 meses atras.' },
    { title: 'Revisao semanal final do Mes 5', manha: 'Fechamento completo: patrimonio, score, ativos, passivos, emocional.', tarde: 'Compara tudo: mes 1 vs. mes 5. A transformacao eh numerica e emocional.', noite: 'Mes 5 completo. Consolidacao feita. So falta o legado.' },
    { title: 'Fechamento do Mes 5', manha: 'Documente tudo. Numeros, sentimentos, aprendizados.', tarde: 'Prepare-se mentalmente: o ultimo mes sera sobre eternizar o que construiu.', noite: 'Voce esta a 1 mes de completar a jornada. Isso eh extraordinario.' },
    { title: 'Transicao para o Mes 6', manha: 'Leia os objetivos do Mes 6: Legado e Escala.', tarde: 'Liste: o que voce quer que exista daqui a 10 anos graças ao trabalho de hoje?', noite: 'Legado comeca com uma decisao: "Isso vai durar alem de mim."' },
  ],
  6: [
    { title: 'Defina seu legado financeiro', manha: 'Escreva: o que voce quer que sua familia tenha em 10, 20, 30 anos?', tarde: 'Legado nao eh so patrimonio. Eh educacao financeira passada para frente.', noite: 'A maior heranca: habitos saudaveis com dinheiro.' },
    { title: 'Crie plano familiar de financas', manha: 'Reuna a familia. Apresente: patrimonio atual, metas, plano de crescimento.', tarde: 'Defina metas familiares: reserva familiar, fundo de educacao, viagem anual.', noite: 'Familia alinhada financeiramente eh familia unida.' },
    { title: 'Defina metas de 12 meses', manha: 'Projete: onde quer estar em 12 meses? Patrimonio? Renda? Reserva?', tarde: 'Quebre em metas trimestrais. Trimestre por trimestre.', noite: 'Meta de 12 meses escrita = contrato consigo mesmo.' },
    { title: 'Planeje expansao de renda', manha: 'Como dobrar sua renda em 12 meses? Quais caminhos existem?', tarde: 'Liste: promocao, negocio paralelo, investimentos, freelance, produto digital.', noite: 'Escolha 2 caminhos e comece a trabalhar neles esta semana.' },
    { title: 'Protecao juridica basica', manha: 'Pesquise: testamento, uniao estavel, regime de bens, procuracao.', tarde: 'Consulte um advogado ou use servico online. Custos: R$200-500.', noite: 'Protecao juridica eh amor pela familia em forma de documento.' },
    { title: 'Planeje previdencia complementar', manha: 'Pesquise: PGBL vs. VGBL. Qual faz sentido para voce?', tarde: 'Se ja tem, revise: taxas, rentabilidade, portabilidade.', noite: 'Previdencia nao substitui investimentos, mas complementa.' },
    { title: 'Revisao semanal #21', manha: 'Legado: plano familiar definido? Metas de 12 meses escritas?', tarde: 'Protecao juridica em andamento? Previdencia avaliada?', noite: 'O ultimo mes eh sobre visao de longo prazo. Continue.' },
    { title: 'Ensine alguem sobre financas', manha: 'Escolha 1 pessoa que precisa de ajuda financeira. Filho, amigo, irmao.', tarde: 'Compartilhe suas 3 maiores licoes destes 6 meses.', noite: 'Ensinar consolida seu proprio aprendizado. Generosidade gera retorno.' },
    { title: 'Crie fundo de educacao', manha: 'Se tem filhos: quanto custa a educacao deles? Faculdade, cursos?', tarde: 'Inicie fundo de educacao separado. Mesmo R$100/mes faz diferenca em 15 anos.', noite: 'Investir na educacao dos filhos eh o investimento de maior retorno social.' },
    { title: 'Diversifique patrimonio', manha: 'Revise: esta muito concentrado em 1 tipo de ativo? Diversifique.', tarde: 'Considere: imoveis, acoes, fundos, renda fixa, internacional.', noite: 'Diversificacao eh protecao. Nao aposte tudo em uma carta.' },
    { title: 'Faca doacao estrategica (Tsedaka)', manha: 'Na tradicao judaica, Tsedaka (justica/doacao) traz prosperidade.', tarde: 'Doe 10% do que ganhou de renda extra. Para causa que acredita.', noite: 'Generosidade nao diminui. Multiplica. Essa eh a sabedoria milenar.' },
    { title: 'Construa sistema de revisao permanente', manha: 'Crie rotina mensal fixa: dia 1 = revisao financeira completa.', tarde: 'Template: receita, gasto, investimento, patrimonio liquido, score.', noite: 'Sistema permanente = prosperidade permanente.' },
    { title: 'Planeje proximos investimentos', manha: 'Com base nos 6 meses, quais investimentos quer fazer nos proximos 12?', tarde: 'Pesquise e anote: tipo, valor, prazo, objetivo.', noite: 'Investir com planejamento > investir por impulso. Sempre.' },
    { title: 'Revisao semanal #22', manha: 'Legado estruturado? Fundo de educacao iniciado? Doacao feita?', tarde: 'Sistema de revisao permanente criado?', noite: 'Voce esta construindo algo que vai durar geracoes.' },
    { title: 'Elimine ultimo habito financeiro toxico', manha: 'Qual habito financeiro voce AINDA tem que sabota seu crescimento?', tarde: 'Substitua por habito positivo. Ex: scroll no shopping online -> leitura financeira.', noite: 'Habitos definem destino. Escolha os seus conscientemente.' },
    { title: 'Crie mantra financeiro pessoal', manha: 'Escreva 1 frase que resume sua filosofia financeira. Ex: "Construo com paciencia e colho com gratidao."', tarde: 'Coloque em lugar visivel: tela do celular, espelho, geladeira.', noite: 'Repita diariamente. Identidade precede comportamento.' },
    { title: 'Projete patrimonio em 5 e 10 anos', manha: 'Se mantiver a disciplina: quanto tera em 5 anos? Calcule com juros compostos.', tarde: 'E em 10 anos? O numero vai te impressionar e motivar.', noite: 'Visao de longo prazo muda decisoes de curto prazo.' },
    { title: 'Revisao trimestral final', manha: 'Avalie o trimestre 2 (meses 4-6): patrimonio, renda, investimentos.', tarde: 'Compare com trimestre 1 (meses 1-3). A evolucao eh clara?', noite: 'Voce cresceu em 6 meses mais do que a maioria cresce em anos.' },
    { title: 'Crie ritual financeiro diario', manha: 'Ritual: 3 min todo dia. Saldo, gasto principal, gratidao financeira.', tarde: 'Pratique hoje. Cronometre. 3 minutos muda tudo.', noite: 'Disciplina diaria > grande acao eventual. Sempre.' },
    { title: 'Prepare plano de contingencia', manha: 'E se tudo der errado? Qual seu plano B financeiro?', tarde: 'Anote: reserva para X meses, habilidade vendavel, rede de apoio.', noite: 'Quem tem plano B nao entra em panico. Paz financeira.' },
    { title: 'Revisao semanal #23', manha: 'Todos os sistemas funcionando? Revisao, investimento, protecao?', tarde: 'Emocionalmente: como esta sua relacao com dinheiro agora?', noite: 'A jornada esta se completando. Mais 1 semana.' },
    { title: 'Documente toda a jornada', manha: 'Revise dia a dia: quais foram os 5 momentos mais transformadores?', tarde: 'Escreva: como voce era com dinheiro no dia 1 vs. agora?', noite: 'Essa documentacao eh seu legado pessoal de crescimento.' },
    { title: 'Planeje pos-jornada', manha: 'Os 6 meses acabam, mas a disciplina continua. Qual sua rotina permanente?', tarde: 'Revisao mensal, investimento automatico, educacao continua, Tsedaka.', noite: 'A jornada estrutura. A disciplina mantem. Voce tem ambos.' },
    { title: 'Celebracao e gratidao', manha: 'Liste TUDO que conquistou: reserva, patrimonio, renda, paz, conhecimento.', tarde: 'Compartilhe com sua familia. Celebre junto. Voces construiram juntos.', noite: 'Gratidao profunda. Voce fez o que pouquissimos fazem: agiu por 6 meses.' },
    { title: 'Ultimo score financeiro', manha: 'Calcule o score final: reserva + investimentos + renda + disciplina + emocional.', tarde: 'Compare: dia 1 vs. dia 180. A evolucao deve ser dramatica.', noite: 'Esse score eh sua nota pessoal. Voce a construiu dia por dia.' },
    { title: 'Defina compromisso permanente', manha: 'Escreva: "Eu me comprometo a manter minha disciplina financeira para sempre."', tarde: 'Assine. Date. Guarde. Releia todo mes.', noite: 'Compromisso escrito tem poder. Use-o.' },
    { title: 'Revisao semanal #24 e fechamento final', manha: 'Balanco completo e final: patrimonio, reserva, investimentos, renda, score.', tarde: 'Revisao emocional final: paz, confianca, gratidao.', noite: 'Voce completou uma jornada rara. Honre isso com continuidade.' },
    { title: 'Fechamento do Mes 6', manha: 'Documente TUDO. Numeros finais, conquistas, transformacao.', tarde: 'Tire foto da documentacao. Guarde para sempre.', noite: 'Parabens. Voce construiu em 6 meses o que a maioria nao constroi em uma vida.' },
    { title: 'Revisao semestral permanente', manha: 'A cada 6 meses: repita esta revisao completa. Patrimonio, metas, ajustes.', tarde: 'A jornada acabou, mas o sistema eh permanente. Voce agora tem um metodo.', noite: 'Shalom. Que a prosperidade construida com sabedoria te acompanhe sempre.' },
    { title: 'Dia de celebracao final', manha: 'Hoje eh dia de descanso e gratidao. Nenhuma tarefa financeira.', tarde: 'Apenas releia seu diario da jornada. Sinta o orgulho merecido.', noite: 'A jornada do Codigo Judaico da Prosperidade esta completa. Voce venceu.' },
  ],
}

// ── Oracoes por area tematica (sem emojis) ───────────────────

const PRAYERS = [
  'HaShem, abencoe meu trabalho e minha disciplina hoje.',
  'Pai Celestial, de-me sabedoria para cada decisao financeira.',
  'Eterno, que meu esforco de hoje gere frutos duradouros.',
  'Criador, ensine-me a prosperar com etica e proposito.',
  'HaShem, fortalece minha disciplina e protege meu patrimonio.',
  'Eterno, agradeco pelo progresso e peco sabedoria para continuar.',
  'Pai, abencoe minha familia com paz e prosperidade.',
]

const REFLECTIONS = [
  'Estou no caminho certo? O que preciso ajustar?',
  'Minhas acoes de hoje me aproximam da prosperidade?',
  'O que aprendi sobre disciplina financeira hoje?',
  'Como posso ser mais intencional amanha?',
  'Minha familia esta alinhada com meus objetivos?',
  'Estou construindo algo duradouro ou apenas sobrevivendo?',
  'O que Deus esta me ensinando atraves das financas?',
]

const PROVERBS = [
  '"Planos bem pensados levam a prosperidade." \u2014 Proverbios 21:5',
  '"O trabalhador diligente tera fartura." \u2014 Proverbios 13:4',
  '"Onde ha conselho, ha seguranca." \u2014 Proverbios 11:14',
  '"A mao diligente dominara." \u2014 Proverbios 12:24',
  '"Quem cuida do que eh pouco recebera mais." \u2014 Sabedoria judaica',
  '"A bencao repousa sobre quem age com justica." \u2014 Talmud',
  '"Descanse, mas nunca desista." \u2014 Sabedoria judaica',
]

// ── Gerador de dia ───────────────────────────────────────────

export function getSixMonthDay(dayIndex) {
  // dayIndex: 0..179
  var month = Math.floor(dayIndex / 30) + 1
  if (month > 6) month = 6
  var dayInMonth = dayIndex % 30
  var activities = DAILY_ACTIVITIES[month]
  if (!activities) activities = DAILY_ACTIVITIES[6]
  var dayOfWeek = dayIndex % 7
  var act = activities[Math.min(dayInMonth, activities.length - 1)]

  return {
    dayIndex: dayIndex,
    globalDayIndex: dayIndex + 21,
    month: month,
    dayInMonth: dayInMonth + 1,
    monthTitle: MONTH_PLAN[month - 1].title,
    title: act.title,
    manha: act.manha,
    tarde: act.tarde,
    noite: act.noite,
    oracao: PRAYERS[dayOfWeek],
    reflexao: REFLECTIONS[dayOfWeek],
    proverbio: PROVERBS[dayOfWeek],
    weekFocus: MONTH_PLAN[month - 1].subtitle,
    area: MONTH_PLAN[month - 1].title,
  }
}

export function getMonthDays(monthNum) {
  var start = (monthNum - 1) * 30
  var days = []
  for (var i = 0; i < 30; i++) {
    days.push(getSixMonthDay(start + i))
  }
  return days
}

export function getSixMonthWeek(weekIndex) {
  var month = Math.floor(weekIndex / 4) + 1
  if (month > 6) month = 6
  return MONTH_PLAN[month - 1]
}

export function getAllSixMonthDays() {
  return Array.from({ length: 180 }, function (_, i) { return getSixMonthDay(i) })
}

export var MILESTONES = [
  { day: 30, label: '1o mes completo', description: 'Fundacao financeira organizada' },
  { day: 60, label: '2o mes completo', description: 'Blindagem financeira estabelecida' },
  { day: 90, label: 'Marco trimestral', description: 'Expansao de receita e revisao completa' },
  { day: 120, label: '4o mes completo', description: 'Patrimonio ativo e investindo' },
  { day: 150, label: '5o mes completo', description: 'Consolidacao e protecao' },
  { day: 180, label: 'Jornada completa!', description: '6 meses de prosperidade construida' },
]
