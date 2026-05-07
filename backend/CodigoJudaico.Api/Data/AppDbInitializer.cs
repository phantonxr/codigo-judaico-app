using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CodigoJudaico.Api.Data;

public sealed class AppDbInitializer(
    AppDbContext dbContext,
    CatalogSeedLoader catalogSeedLoader,
    PasswordHashService passwordHashService,
    IConfiguration configuration,
    ILogger<AppDbInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        await EnsureConfiguredMasterUserAsync(cancellationToken);
        await EnsureLegalDocumentsAsync(cancellationToken);

        if (await dbContext.Lessons.AnyAsync(cancellationToken))
        {
            return;
        }

        var seed = await catalogSeedLoader.LoadAsync(cancellationToken);

        dbContext.Lessons.AddRange(seed.Lessons.Select((item, index) => new Lesson
        {
            Id = item.Id,
            SortOrder = index,
            Title = item.Title,
            Category = item.Category,
            Duration = item.Duration,
            Teaching = item.Teaching,
            Proverb = item.Proverb,
            Practical = item.Practical,
            Reflection = item.Reflection,
            VideoUrl = item.VideoUrl,
            Summary = item.Summary,
        }));

        dbContext.Plans.AddRange(seed.Plans.Select((item, index) => new Plan
        {
            Id = item.Id,
            SortOrder = index,
            Name = item.Name,
            Price = item.Price,
            Period = item.Period,
            Highlighted = item.Highlighted,
            FeaturesJson = JsonSerializer.Serialize(item.Features),
        }));

        dbContext.Offers.AddRange(seed.Offers.Select((item, index) => new Offer
        {
            Id = item.Id,
            SortOrder = index,
            Title = item.Title,
            Description = item.Description,
            Price = item.Price,
            CtaLabel = item.CtaLabel,
            CtaHref = item.CtaHref,
        }));

        dbContext.WisdomSnippets.AddRange(seed.WisdomSnippets.Select((item, index) => new WisdomSnippet
        {
            Id = item.Id,
            SortOrder = index,
            Source = item.Source,
            Teaching = item.Teaching,
        }));

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Seed inicial aplicado: {Lessons} aulas, {Plans} planos, {Offers} ofertas e {Wisdom} sabedorias.",
            seed.Lessons.Count,
            seed.Plans.Count,
            seed.Offers.Count,
            seed.WisdomSnippets.Count);
    }

    private async Task EnsureConfiguredMasterUserAsync(CancellationToken cancellationToken)
    {
        var email = ApiMappers.NormalizeEmail(configuration["MasterUser:Email"]);
        var password = (configuration["MasterUser:Password"] ?? string.Empty).Trim();
        var name = (configuration["MasterUser:Name"] ?? "Master").Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        if (password.Length < 8)
        {
            logger.LogWarning(
                "MasterUser configurado para {Email}, mas a senha tem menos de 8 caracteres. O usuario master nao foi criado.",
                email);
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user is null)
        {
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = string.IsNullOrWhiteSpace(name) ? "Master" : name,
                CreatedAt = now,
            };

            dbContext.Users.Add(user);
        }
        else if (!string.IsNullOrWhiteSpace(name))
        {
            user.Name = name;
        }

        user.IsMasterUser = true;
        user.PasswordHash = passwordHashService.HashPassword(password);
        user.PlanName = string.IsNullOrWhiteSpace(user.PlanName) ? "Master" : user.PlanName;
        user.PlanStatus = string.IsNullOrWhiteSpace(user.PlanStatus) ? "Acesso master" : user.PlanStatus;
        user.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Usuario master configurado para {Email}.", email);
    }

    private async Task EnsureLegalDocumentsAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var seeds = BuildLegalDocumentSeeds(now);

        foreach (var seed in seeds)
        {
            var exists = await dbContext.LegalDocuments.AnyAsync(
                x => x.Type == seed.Type && x.Language == seed.Language && x.Version == seed.Version,
                cancellationToken);

            if (exists)
            {
                continue;
            }

            await dbContext.LegalDocuments
                .Where(x => x.Type == seed.Type && x.Language == seed.Language && x.IsActive)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(x => x.IsActive, false)
                        .SetProperty(x => x.UpdatedAt, now),
                    cancellationToken);

            dbContext.LegalDocuments.Add(new LegalDocument
            {
                Id = Guid.NewGuid(),
                Type = seed.Type,
                Language = seed.Language,
                Version = seed.Version,
                Title = seed.Title,
                Content = seed.Content,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static IReadOnlyList<LegalDocumentSeed> BuildLegalDocumentSeeds(DateTimeOffset now)
    {
        const string version = "1.1.0";
        var lastUpdated = now.ToString("yyyy-MM-dd");

        var enTerms = $"""
        Last updated: {lastUpdated}

        Wast Systems develops, distributes, publishes, operates, and receives payments for this software platform. Phantom Systems is responsible for the business content, financial rules, recommendations, AI outputs, guidance, methodology, and domain-specific logic made available through the platform.

        By creating an account, purchasing access, signing in, or using the platform, you agree to these Terms of Service, the Privacy Policy, and the Disclaimer. If you do not agree, do not use the platform.

        The platform may provide financial insights, suggestions, reports, assessments, prompts, AI-generated responses, and other decision-support content. These materials are informational only. They are not financial, investment, tax, legal, accounting, brokerage, fiduciary, or licensed professional advice.

        Wast Systems is not responsible for the accuracy, quality, legality, business validity, recommendations, rules, AI outputs, or decisions generated by the system. Phantom Systems is responsible for the accuracy, quality, and legal/business validity of the content and domain-specific logic.

        You are responsible for reviewing all outputs, checking your own facts, evaluating your personal situation, and deciding whether any action is appropriate. No outcome, savings, investment result, profit, tax result, or financial improvement is guaranteed.

        Paid access may be processed through Stripe, app stores, or other authorized payment processors. Subscription terms, renewals, cancellations, taxes, and refunds may depend on the payment provider, plan, and applicable law.

        To the maximum extent permitted by law, Wast Systems is not liable for financial losses, tax consequences, investment losses, business losses, lost profits, indirect damages, or decisions made in reliance on platform content, recommendations, AI outputs, or domain-specific logic.
        """;

        var enPrivacy = $"""
        Last updated: {lastUpdated}

        This Privacy Policy explains how information may be collected and used in this application. Wast Systems develops, distributes, publishes, operates, and receives payments for the software. Phantom Systems is responsible for business content, recommendations, AI outputs, guidance, and domain-specific logic.

        We may collect account information such as name, email, authentication status, plan, payment status, access history, and support interactions.

        We may collect financial inputs, preferences, assessment answers, goals, spending patterns, debts, assets, reflections, chat prompts, AI interaction history, progress data, local storage preferences, legal acceptance records, and other information you submit to receive insights or recommendations.

        We use data to operate accounts, process subscriptions, provide access, generate app experiences, personalize content, support AI-assisted features, improve reliability, protect the platform, comply with law, support payments, and respond to privacy requests.

        With your optional marketing and attribution consent, we may store UTM campaign parameters and send checkout/conversion events to attribution providers such as UTMfy. If you reject or withdraw this optional consent, we do not intentionally store new UTMs or send new UTMfy attribution events.

        Relevant inputs may be used by or made available to systems operating under Phantom Systems responsibility when needed to provide business content, financial recommendations, AI outputs, rules, or domain-specific logic.

        We do not sell your personal financial inputs as standalone data. We limit sharing to service providers and situations reasonably needed for hosting, support, security, payment processing, legal compliance, app stores, fraud prevention, AI generation, optional marketing attribution, and Phantom Systems content responsibilities.

        We use reasonable administrative, technical, and organizational safeguards, but no online service can guarantee perfect security. You are responsible for protecting your credentials and using secure devices and networks.

        Depending on applicable law, including LGPD, GDPR, PIPEDA/Canada, Quebec privacy law, and US state privacy laws where applicable, you may request access, correction, deletion, export, restriction, objection, opt-out of sale/sharing, or withdrawal of consent. Some records may be retained for legal, tax, security, backup, dispute, payment, and compliance purposes.
        """;

        var enDisclaimer = $"""
        Last updated: {lastUpdated}

        IMPORTANT: This is not financial advice.

        Content generated or displayed by this application is for informational and educational purposes only. It is not financial, investment, tax, legal, accounting, brokerage, fiduciary, or licensed professional advice.

        The application may generate insights, recommendations, reports, financial assessments, projections, plans, AI responses, or suggested actions. These outputs may be incomplete, inaccurate, outdated, unsuitable for your circumstances, or legally/tax inappropriate in your jurisdiction.

        No result is guaranteed. The system does not guarantee profit, savings, investment performance, debt reduction, tax treatment, compliance, wealth creation, or any other financial outcome.

        You are solely responsible for your financial decisions, actions, inaction, losses, taxes, compliance obligations, and outcomes. You must independently verify all information before relying on it.

        You should consult a licensed financial professional, investment advisor, tax professional, accountant, attorney, or other qualified professional before making financial, investment, tax, legal, retirement, insurance, debt, or business decisions.

        Wast Systems develops, distributes, publishes, and receives payments for the software, but Wast Systems is not responsible for financial content, recommendations, AI outputs, business rules, domain-specific logic, or decisions generated by the system. Phantom Systems is responsible for the accuracy, quality, and legal/business validity of the content, recommendations, AI outputs, and domain-specific logic.
        """;

        var ptTerms = $"""
        Ultima atualizacao: {lastUpdated}

        A Wast Systems desenvolve, distribui, publica, opera e recebe pagamentos por esta plataforma de software. A Phantom Systems e responsavel pelo conteudo de negocio, regras financeiras, recomendacoes, saidas de IA, orientacoes, metodologia e logica especifica de dominio disponibilizadas pela plataforma.

        Ao criar uma conta, comprar acesso, entrar ou usar a plataforma, voce concorda com estes Termos de Uso, a Politica de Privacidade e o Aviso Legal. Se voce nao concordar, nao use a plataforma.

        A plataforma pode fornecer insights financeiros, sugestoes, relatorios, avaliacoes, prompts, respostas geradas por IA e outros conteudos de apoio a decisao. Esses materiais sao apenas informativos. Eles nao sao aconselhamento financeiro, de investimento, tributario, juridico, contabil, de corretagem, fiduciario ou profissional licenciado.

        A Wast Systems nao e responsavel pela precisao, qualidade, legalidade, validade de negocio, recomendacoes, regras, saidas de IA ou decisoes geradas pelo sistema. A Phantom Systems e responsavel pela precisao, qualidade e validade legal/de negocio do conteudo e da logica especifica de dominio.

        Voce e responsavel por revisar todas as saidas, conferir seus proprios dados, avaliar sua situacao pessoal e decidir se qualquer acao e adequada. Nenhum resultado, economia, retorno de investimento, lucro, resultado tributario ou melhora financeira e garantido.

        O acesso pago pode ser processado por Stripe, lojas de aplicativos ou outros processadores autorizados. Termos de assinatura, renovacoes, cancelamentos, impostos e reembolsos podem depender do provedor de pagamento, plano e lei aplicavel.

        Na extensao maxima permitida por lei, a Wast Systems nao se responsabiliza por perdas financeiras, consequencias tributarias, perdas de investimento, perdas comerciais, lucros cessantes, danos indiretos ou decisoes tomadas com base em conteudo, recomendacoes, saidas de IA ou logica especifica de dominio da plataforma.
        """;

        var ptPrivacy = $"""
        Ultima atualizacao: {lastUpdated}

        Esta Politica de Privacidade explica como informacoes podem ser coletadas e usadas neste aplicativo. A Wast Systems desenvolve, distribui, publica, opera e recebe pagamentos pelo software. A Phantom Systems e responsavel pelo conteudo de negocio, recomendacoes, saidas de IA, orientacoes e logica especifica de dominio.

        Podemos coletar informacoes de conta, como nome, e-mail, status de autenticacao, plano, status de pagamento, historico de acesso e interacoes de suporte.

        Podemos coletar entradas financeiras, preferencias, respostas de avaliacao, objetivos, padroes de gastos, dividas, ativos, reflexoes, prompts de chat, historico de interacao com IA, dados de progresso, preferencias em armazenamento local, registros de aceite legal e outras informacoes que voce envia para receber insights ou recomendacoes.

        Usamos dados para operar contas, processar assinaturas, fornecer acesso, gerar experiencias no aplicativo, personalizar conteudo, apoiar recursos assistidos por IA, melhorar confiabilidade, proteger a plataforma, cumprir a lei, apoiar pagamentos e responder a solicitacoes de privacidade.

        Com seu consentimento opcional para marketing e atribuicao, podemos armazenar parametros UTM de campanha e enviar eventos de checkout/conversao para provedores de atribuicao como UTMfy. Se voce recusar ou retirar esse consentimento opcional, nao armazenamos novas UTMs intencionalmente nem enviamos novos eventos de atribuicao para a UTMfy.

        Entradas relevantes podem ser usadas por sistemas sob responsabilidade da Phantom Systems quando necessario para fornecer conteudo de negocio, recomendacoes financeiras, saidas de IA, regras ou logica especifica de dominio.

        Nao vendemos suas entradas financeiras pessoais como dados independentes. Limitamos o compartilhamento a prestadores e situacoes razoavelmente necessarias para hospedagem, suporte, seguranca, processamento de pagamentos, conformidade legal, lojas de aplicativos, prevencao a fraude, geracao de IA, atribuicao opcional de marketing e responsabilidades de conteudo da Phantom Systems.

        Usamos salvaguardas administrativas, tecnicas e organizacionais razoaveis, mas nenhum servico online pode garantir seguranca perfeita. Voce e responsavel por proteger suas credenciais e usar dispositivos e redes seguros.

        Dependendo da lei aplicavel, incluindo LGPD, GDPR, PIPEDA/Canada, lei de privacidade de Quebec e leis estaduais dos EUA quando aplicaveis, voce pode solicitar acesso, correcao, exclusao, exportacao, restricao, oposicao, opt-out de venda/compartilhamento ou retirada de consentimento. Alguns registros podem ser mantidos para fins legais, fiscais, de seguranca, backup, disputa, pagamento e conformidade.
        """;

        var ptDisclaimer = $"""
        Ultima atualizacao: {lastUpdated}

        IMPORTANTE: Isto nao e aconselhamento financeiro.

        O conteudo gerado ou exibido por este aplicativo tem finalidade apenas informativa e educacional. Ele nao e aconselhamento financeiro, de investimento, tributario, juridico, contabil, de corretagem, fiduciario ou profissional licenciado.

        O aplicativo pode gerar insights, recomendacoes, relatorios, avaliacoes financeiras, projecoes, planos, respostas de IA ou acoes sugeridas. Essas saidas podem ser incompletas, imprecisas, desatualizadas, inadequadas para suas circunstancias ou inadequadas do ponto de vista legal/tributario na sua jurisdicao.

        Nenhum resultado e garantido. O sistema nao garante lucro, economia, desempenho de investimento, reducao de dividas, tratamento tributario, conformidade, criacao de patrimonio ou qualquer outro resultado financeiro.

        Voce e o unico responsavel por suas decisoes financeiras, acoes, omissoes, perdas, impostos, obrigacoes de conformidade e resultados. Voce deve verificar independentemente todas as informacoes antes de confiar nelas.

        Voce deve consultar um profissional financeiro licenciado, consultor de investimentos, profissional tributario, contador, advogado ou outro profissional qualificado antes de tomar decisoes financeiras, de investimento, tributarias, juridicas, previdenciarias, de seguro, divida ou negocio.

        A Wast Systems desenvolve, distribui, publica e recebe pagamentos pelo software, mas a Wast Systems nao e responsavel por conteudo financeiro, recomendacoes, saidas de IA, regras de negocio, logica especifica de dominio ou decisoes geradas pelo sistema. A Phantom Systems e responsavel pela precisao, qualidade e validade legal/de negocio do conteudo, recomendacoes, saidas de IA e logica especifica de dominio.
        """;

        return
        [
            new("terms", "en", version, "Terms of Service", enTerms),
            new("privacy", "en", version, "Privacy Policy", enPrivacy),
            new("disclaimer", "en", version, "Disclaimer", enDisclaimer),
            new("terms", "pt-BR", version, "Termos de Uso", ptTerms),
            new("privacy", "pt-BR", version, "Politica de Privacidade", ptPrivacy),
            new("disclaimer", "pt-BR", version, "Aviso Legal", ptDisclaimer),
        ];
    }

    private sealed record LegalDocumentSeed(
        string Type,
        string Language,
        string Version,
        string Title,
        string Content);
}
