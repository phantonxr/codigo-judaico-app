using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace CodigoJudaico.Api.Endpoints;

public static class MentorEndpoints
{
    private const int DefaultDailyLimit = 3;
    private const string MentorUnlimitedPlanType = "mentor_unlimited";

    public static IEndpointRouteBuilder MapMentorEndpoints(this IEndpointRouteBuilder app)
    {
        // Legacy routes (kept for backward compatibility)
        var group = app.MapGroup("/api")
            .WithTags("Mentor")
            .RequireAuthorization()
            .AddEndpointFilter<RequirePremiumAccessEndpointFilter>();

        group.MapPost("/rabino-mentor", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            MentorChatRequest request,
            AppDbContext dbContext,
            MentorFallbackService fallbackService,
            MentorOpenAiClient openAiClient,
            CancellationToken cancellationToken) =>
        {
            var message = ApiMappers.Clean(request.Message);

            if (string.IsNullOrWhiteSpace(message))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["message"] = ["A mensagem do usuario nao pode estar vazia."]
                });
            }

            string reply;

            if (openAiClient.IsConfigured)
            {
                try
                {
                    var ai = await openAiClient.CompleteMentorChatAsync(request, cancellationToken);
                    if (!string.IsNullOrWhiteSpace(ai))
                        reply = ai;
                    else
                        reply = fallbackService.BuildMentorReply(message, request.CurrentPlan);
                }
                catch (Exception)
                {
                    reply = fallbackService.BuildMentorReply(message, request.CurrentPlan);
                }
            }
            else
            {
                reply = fallbackService.BuildMentorReply(message, request.CurrentPlan);
            }

            var userId = userPrincipal.GetRequiredUserId();

            var now = DateTimeOffset.UtcNow;

            dbContext.MentorChatMessages.AddRange(
                new MentorChatMessage
                {
                    UserId = userId,
                    Role = "user",
                    Content = message,
                    CreatedAt = now,
                },
                new MentorChatMessage
                {
                    UserId = userId,
                    Role = "assistant",
                    Content = reply,
                    CreatedAt = now.AddMilliseconds(1),
                });

            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(new MentorChatResponse(reply));
        });

        group.MapPost("/rabino-daily-feedback", async Task<IResult> (
            DailyFeedbackRequest request,
            MentorFallbackService fallbackService,
            MentorOpenAiClient openAiClient,
            CancellationToken cancellationToken) =>
        {
            if (openAiClient.IsConfigured && !string.IsNullOrWhiteSpace(request.SystemPrompt))
            {
                try
                {
                    var raw = await openAiClient.CompleteDailyFeedbackAsync(
                        request.SystemPrompt,
                        cancellationToken);

                    var parsed = MentorOpenAiClient.TryParseDailyFeedback(raw);
                    if (parsed is not null)
                        return Results.Ok(parsed);
                }
                catch (Exception)
                {
                    // Fall through to deterministic fallback
                }
            }

            var payload = fallbackService.BuildDailyFeedback(request.CurrentDay ?? 0);

            return Results.Ok(new DailyFeedbackResponse(
                payload.Summary,
                payload.Correction,
                payload.MacroLesson,
                payload.Blindspot,
                payload.JewishWisdom,
                payload.Proverb,
                payload.NextFocus,
                payload.ExtraTask,
                payload.TomorrowFocus));
        });

        // New endpoints requested (do not require premium filter; they manage limits internally).
        var mentorGroup = app.MapGroup("/api/mentor")
            .WithTags("Mentor")
            .RequireAuthorization();

        mentorGroup.MapGet("/daily-feedback", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            string? phase,
            int dayNumber,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var cleanedPhase = ApiMappers.Clean(phase) ?? string.Empty;

            if (string.IsNullOrWhiteSpace(cleanedPhase) || dayNumber <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["phase"] = ["Informe a fase."],
                    ["dayNumber"] = ["Informe o dia (>= 1)."],
                });
            }

            var existing = await dbContext.MentorDailyFeedbacks
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(
                    x => x.UserId == userId && x.Phase == cleanedPhase && x.DayNumber == dayNumber,
                    cancellationToken);

            if (existing is null)
            {
                return Results.NotFound();
            }

            return Results.Ok(new MentorDailyFeedbackGenerateResponse(
                existing.DetectedTrigger,
                existing.EmotionalPattern,
                existing.FinancialRisk,
                existing.JewishWisdom,
                existing.PracticalAction,
                existing.FeedbackText,
                existing.DetectedEmotion,
                existing.TriggerType,
                existing.ObservedPattern));
        });

            mentorGroup.MapGet("/usage", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var planType = await ResolveMentorPlanTypeAsync(userId, dbContext, cancellationToken);
            var dailyLimit = ResolveDailyLimit(planType);
            var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.DateTime);

            var usage = await dbContext.MentorUsages
                .SingleOrDefaultAsync(x => x.UserId == userId && x.Date == today, cancellationToken);

            var interactionsToday = usage?.InteractionsCount ?? 0;
            var canSend = dailyLimit == int.MaxValue || interactionsToday < dailyLimit;

            return Results.Ok(new MentorUsageResponse(interactionsToday, dailyLimit, canSend, planType));
        });

        mentorGroup.MapPost("/chat", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            MentorChatRequest request,
            AppDbContext dbContext,
            MentorFallbackService fallbackService,
            MentorOpenAiClient openAiClient,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var planType = await ResolveMentorPlanTypeAsync(userId, dbContext, cancellationToken);
            var dailyLimit = ResolveDailyLimit(planType);
            var now = DateTimeOffset.UtcNow;

            var today = DateOnly.FromDateTime(now.DateTime);

            var usage = await dbContext.MentorUsages
                .SingleOrDefaultAsync(x => x.UserId == userId && x.Date == today, cancellationToken);

            if (dailyLimit != int.MaxValue && usage is not null && usage.InteractionsCount >= dailyLimit)
            {
                return Results.Json(
                    new MentorChatBlockedResponse(
                        Code: "daily_limit_reached",
                        Message:
                            "Voce ja recebeu as 3 orientacoes rabinicas de hoje. Para continuar conversando livremente com o Rabino Mentor e receber direcionamento personalizado sempre que precisar, desbloqueie o Acompanhamento Rabinico Ilimitado.",
                        InteractionsToday: usage.InteractionsCount,
                        DailyLimit: dailyLimit,
                        PlanType: planType,
                        CtaLabel: "Desbloquear Rabino Mentor Ilimitado — R$ 17,90/mes",
                        UpsellName: "Acompanhamento Rabinico Ilimitado",
                        UpsellPrice: "R$ 17,90/mes"),
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (dailyLimit != int.MaxValue)
            {
                if (usage is null)
                {
                    usage = new MentorUsage
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Date = today,
                        InteractionsCount = 0,
                        PlanType = planType,
                        CreatedAt = now,
                        UpdatedAt = now,
                    };
                    dbContext.MentorUsages.Add(usage);
                }

                usage.PlanType = planType;
                usage.InteractionsCount += 1;
                usage.UpdatedAt = now;
            }

            var message = ApiMappers.Clean(request.Message);
            if (string.IsNullOrWhiteSpace(message))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["message"] = ["A mensagem do usuario nao pode estar vazia."]
                });
            }

            string reply;

            if (openAiClient.IsConfigured)
            {
                try
                {
                    var ai = await openAiClient.CompleteMentorChatAsync(request, cancellationToken);
                    reply = string.IsNullOrWhiteSpace(ai)
                        ? fallbackService.BuildMentorReply(message, request.CurrentPlan)
                        : ai;
                }
                catch
                {
                    reply = fallbackService.BuildMentorReply(message, request.CurrentPlan);
                }
            }
            else
            {
                reply = fallbackService.BuildMentorReply(message, request.CurrentPlan);
            }

            dbContext.MentorChatMessages.AddRange(
                new MentorChatMessage
                {
                    UserId = userId,
                    Role = "user",
                    Content = message,
                    CreatedAt = now,
                },
                new MentorChatMessage
                {
                    UserId = userId,
                    Role = "assistant",
                    Content = reply,
                    CreatedAt = now.AddMilliseconds(1),
                });

            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(new MentorChatResponse(reply));
        });

        mentorGroup.MapPost("/daily-feedback", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            MentorDailyFeedbackGenerateRequest request,
            AppDbContext dbContext,
            MentorOpenAiClient openAiClient,
            MentorFallbackService fallbackService,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var phase = ApiMappers.Clean(request.Phase) ?? string.Empty;
            var dayNumber = request.DayNumber;

            if (string.IsNullOrWhiteSpace(phase))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["phase"] = ["Informe a fase atual."]
                });
            }

            if (dayNumber <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["dayNumber"] = ["Informe o dia da jornada (>= 1)."]
                });
            }

            var existing = await dbContext.MentorDailyFeedbacks
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(
                    x => x.UserId == userId && x.Phase == phase && x.DayNumber == dayNumber,
                    cancellationToken);

            if (existing is not null)
            {
                return Results.Ok(new MentorDailyFeedbackGenerateResponse(
                    existing.DetectedTrigger,
                    existing.EmotionalPattern,
                    existing.FinancialRisk,
                    existing.JewishWisdom,
                    existing.PracticalAction,
                    existing.FeedbackText,
                    existing.DetectedEmotion,
                    existing.TriggerType,
                    existing.ObservedPattern));
            }

            var history = await dbContext.MentorDailyFeedbacks
                .Where(x => x.UserId == userId && x.Phase == phase && x.DayNumber > 0 && x.DayNumber < dayNumber)
                .OrderBy(x => x.DayNumber)
                .ToListAsync(cancellationToken);

            MentorDailyFeedbackGenerateResponse? parsed = null;

            if (openAiClient.IsConfigured)
            {
                var userPayload = BuildDailyFeedbackPromptPayload(request, phase, dayNumber, history);
                var system = BuildMentorSystemForDailyFeedback();

                try
                {
                    var raw = await openAiClient.CompleteMentorDailyFeedbackV2Async(
                        system,
                        userPayload,
                        cancellationToken);

                    parsed = MentorOpenAiClient.TryParseMentorDailyFeedbackV2(raw);
                }
                catch
                {
                    parsed = null;
                }
            }

            parsed ??= BuildDailyFeedbackFallback(request, dayNumber);

            parsed = EnsureDailyFeedbackSignals(parsed, request);

            var now = DateTimeOffset.UtcNow;
            dbContext.MentorDailyFeedbacks.Add(new MentorDailyFeedback
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Phase = phase,
                DayNumber = dayNumber,
                DetectedEmotion = parsed.DetectedEmotion,
                TriggerType = parsed.TriggerType,
                ObservedPattern = parsed.ObservedPattern,
                DetectedTrigger = parsed.DetectedTrigger,
                EmotionalPattern = parsed.EmotionalPattern,
                FinancialRisk = parsed.FinancialRisk,
                JewishWisdom = parsed.JewishWisdom,
                PracticalAction = parsed.PracticalAction,
                FeedbackText = parsed.FeedbackText,
                CreatedAt = now,
            });

            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.Ok(parsed);
        });

        mentorGroup.MapGet("/final-report", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();

            var existing = await dbContext.MentorFinalReports
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

            if (existing is null)
            {
                return Results.NotFound();
            }

            var topTriggers = SafeParseStringList(existing.TopTriggersJson);
            var dto = new MentorFinalReportGenerateResponse(
                existing.ReportText,
                topTriggers,
                existing.EmotionalPattern,
                existing.FinancialRiskPattern,
                existing.NextStepRecommendation,
                OfferBlock: BuildDefaultOfferBlock());

            return Results.Ok(BuildFinalReportPublicResponse(dto));
        });

        mentorGroup.MapPost("/final-report", async Task<IResult> (
            ClaimsPrincipal userPrincipal,
            MentorFinalReportGenerateRequest request,
            AppDbContext dbContext,
            MentorOpenAiClient openAiClient,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();

            var existing = await dbContext.MentorFinalReports
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

            if (existing is not null)
            {
                var topTriggers = SafeParseStringList(existing.TopTriggersJson);
                var dto = new MentorFinalReportGenerateResponse(
                    existing.ReportText,
                    topTriggers,
                    existing.EmotionalPattern,
                    existing.FinancialRiskPattern,
                    existing.NextStepRecommendation,
                    OfferBlock: BuildDefaultOfferBlock());

                return Results.Ok(BuildFinalReportPublicResponse(dto));
            }

            MentorFinalReportGenerateResponse? parsed = null;

            if (openAiClient.IsConfigured)
            {
                var system = BuildMentorSystemForFinalReport();
                var progressiveProfileSummary = await BuildProgressiveProfileSummaryAsync(dbContext, userId, cancellationToken);
                var payload = BuildFinalReportPromptPayload(request, progressiveProfileSummary);
                try
                {
                    var raw = await openAiClient.CompleteMentorFinalReportAsync(system, payload, cancellationToken);
                    parsed = MentorOpenAiClient.TryParseMentorFinalReport(raw);
                }
                catch
                {
                    parsed = null;
                }
            }

            parsed ??= BuildFinalReportFallback();

            var now = DateTimeOffset.UtcNow;
            dbContext.MentorFinalReports.Add(new MentorFinalReport
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ReportText = parsed.ReportText,
                TopTriggersJson = JsonSerializer.Serialize(parsed.TopTriggers),
                EmotionalPattern = parsed.EmotionalPattern,
                FinancialRiskPattern = parsed.FinancialRiskPattern,
                NextStepRecommendation = parsed.NextStepRecommendation,
                OfferShown = true,
                CreatedAt = now,
            });

            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.Ok(BuildFinalReportPublicResponse(parsed));
        });

        return app;
    }

    private static MentorFinalReportPublicResponse BuildFinalReportPublicResponse(MentorFinalReportGenerateResponse report)
    {
        var top = report.TopTriggers ?? Array.Empty<string>();
        var gatilhoPrincipal = top.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))
            ?? ApiMappers.Clean(report.EmotionalPattern)
            ?? string.Empty;

        var sabedoria = TryExtractBetweenMarkers(report.ReportText, "D)", "E)");
        if (string.IsNullOrWhiteSpace(sabedoria))
        {
            sabedoria = report.ReportText;
        }

        var cta = "Desbloquear minha Trilha Chodesh HaMelech";
        var recomendacao = ApiMappers.Clean(report.NextStepRecommendation) ?? string.Empty;

        return new MentorFinalReportPublicResponse(
            Analise: report.ReportText,
            CorrecaoDeRota: recomendacao,
            SabedoriaJudaica: sabedoria,
            FocoProximoPasso: recomendacao,
            GatilhoPrincipal: gatilhoPrincipal,
            Recomendacao: recomendacao,
            Cta: cta,
            ReportText: report.ReportText,
            TopTriggers: top,
            EmotionalPattern: report.EmotionalPattern,
            FinancialRiskPattern: report.FinancialRiskPattern,
            NextStepRecommendation: report.NextStepRecommendation,
            OfferBlock: report.OfferBlock);
    }

    private static string TryExtractBetweenMarkers(string? text, string startMarker, string endMarker)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        var start = text.IndexOf(startMarker, StringComparison.OrdinalIgnoreCase);
        if (start < 0)
            return string.Empty;

        start += startMarker.Length;
        var end = text.IndexOf(endMarker, start, StringComparison.OrdinalIgnoreCase);
        if (end < 0)
            end = text.Length;

        return text[start..end].Trim();
    }

    private sealed record MentorFinalReportPublicResponse(
        string Analise,
        string CorrecaoDeRota,
        string SabedoriaJudaica,
        string FocoProximoPasso,
        string GatilhoPrincipal,
        string Recomendacao,
        string Cta,
        string ReportText,
        IReadOnlyList<string> TopTriggers,
        string EmotionalPattern,
        string FinancialRiskPattern,
        string NextStepRecommendation,
        string OfferBlock);

    private static int ResolveDailyLimit(string planType)
    {
        return string.Equals(planType, MentorUnlimitedPlanType, StringComparison.OrdinalIgnoreCase)
            ? int.MaxValue
            : DefaultDailyLimit;
    }

    private static async Task<string> ResolveMentorPlanTypeAsync(
        Guid userId,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var hasUnlimited = await dbContext.Subscriptions.AnyAsync(
            x => x.UserId == userId
                && x.PlanType == MentorUnlimitedPlanType
                && x.Status == "active",
            cancellationToken);

        return hasUnlimited ? MentorUnlimitedPlanType : "limited";
    }

    private static string BuildMentorSystemForDailyFeedback()
    {
        return "Voce e um Rabino Mentor especialista em comportamento financeiro. "
            + "Seu papel NAO e apenas responder — e identificar padroes ao longo do tempo (21 dias). "
            + "Voce recebe respostas do dia atual e um historico de sinais detectados. "
            + "Tonalidade: rabino sabio, firme, humano e acolhedor. Linguagem humana, direta, sem moralismo. "
            + "Nao diagnostique clinicamente. Use termos como 'possivel padrao', 'sinal comportamental', 'tendencia observada'. "
            + "Sempre: emocao dominante, gatilho do dia, padrao observado; compare com historico; destaque repeticao quando houver. "
            + "Conecte com prudencia, dominio proprio, legado e construcao patrimonial. "
            + "Evite repetir sempre 'Shalom'.";
    }

    private static string BuildMentorSystemForFinalReport()
    {
        return "Voce e o Rabino Mentor IA do Codigo Judaico da Prosperidade. "
            + "Escreva como um rabino sabio, firme, humano e acolhedor (linguagem premium). "
            + "Nao diagnostique clinicamente; use termos como 'possivel padrao', 'sinal comportamental', 'tendencia observada'. "
            + "Nao prometa riqueza garantida. "
            + "Evite repetir sempre 'Shalom'. "
            + "No relatorio final, evite a palavra 'assinatura'; prefira 'proxima trilha', 'jornada de dominio' e 'continuacao do metodo'.";
    }

    private static string BuildDailyFeedbackPromptPayload(
        MentorDailyFeedbackGenerateRequest request,
        string phase,
        int dayNumber,
        IReadOnlyList<MentorDailyFeedback> history)
    {
        var completed = request.CompletedTasks ?? Array.Empty<string>();
        var partial = request.PartialTasks ?? Array.Empty<string>();
        var notDone = request.NotCompletedTasks ?? Array.Empty<string>();

        var stageFocus = dayNumber <= 7
            ? "DIA 1-7: foco em identificar emocao dominante"
            : dayNumber <= 14
                ? "DIA 8-14: foco em padroes e repeticoes"
                : "DIA 15-21: foco em confirmar gatilho raiz";

        var lines = new List<string>
        {
            "Contexto:",
            $"- Fase atual: {phase}",
            $"- Dia da jornada: {dayNumber}",
            $"- Foco de hoje: {stageFocus}",
        };

        if (!string.IsNullOrWhiteSpace(request.CurrentTrack))
            lines.Add($"- Trilha atual: {ApiMappers.Clean(request.CurrentTrack)}");

        lines.Add(string.Empty);
        lines.Add("Tarefas executadas:");
        lines.AddRange(completed.Select(x => "- " + ApiMappers.Clean(x)));
        lines.Add(string.Empty);
        lines.Add("Tarefas parciais:");
        lines.AddRange(partial.Select(x => "- " + ApiMappers.Clean(x)));
        lines.Add(string.Empty);
        lines.Add("Tarefas nao executadas:");
        lines.AddRange(notDone.Select(x => "- " + ApiMappers.Clean(x)));
        lines.Add(string.Empty);

        if (!string.IsNullOrWhiteSpace(request.ReflectionText))
            lines.Add("O que fiz hoje: " + ApiMappers.Clean(request.ReflectionText));
        if (!string.IsNullOrWhiteSpace(request.EmotionText))
            lines.Add("Como me senti: " + ApiMappers.Clean(request.EmotionText));
        if (!string.IsNullOrWhiteSpace(request.TriggerText))
            lines.Add("Maior gatilho do dia (informado): " + ApiMappers.Clean(request.TriggerText));

        lines.Add(string.Empty);
        lines.Add("Historico (sinais detectados ate agora):");
        lines.Add(BuildHistorySignalsBlock(history));

        lines.Add(string.Empty);
        lines.Add("Sua missao:");
        lines.Add("1) analisar o comportamento atual");
        lines.Add("2) comparar com padroes anteriores");
        lines.Add("3) identificar repeticoes");
        lines.Add("4) apontar evolucao ou regressao");
        lines.Add("5) sugerir direcao pratica");

        lines.Add(string.Empty);
        lines.Add("Voce deve SEMPRE:");
        lines.Add("- identificar emocao dominante");
        lines.Add("- identificar gatilho do dia");
        lines.Add("- verificar se ja apareceu antes");
        lines.Add("- indicar se e padrao recorrente");
        lines.Add("Se houver repeticao: destaque isso com clareza. Se nao houver: trate como sinal inicial.");

        lines.Add(string.Empty);
        lines.Add("Classificacoes obrigatorias (use EXATAMENTE 1 opcao de cada lista):");
        lines.Add("EMOCOES: ansiedade | carencia | estresse | frustracao | tedio | necessidade de recompensa");
        lines.Add("TIPOS DE GATILHO: validacao social | fuga emocional | impulso imediato | escassez falsa | recompensa emocional | comparacao social | medo de perder oportunidade | descontrole financeiro");
        lines.Add("PADROES: compra para aliviar emocao | ciclo: emocao -> gasto -> alivio -> culpa | busca de identidade/status | consumo automatico");

        lines.Add(string.Empty);
        lines.Add("Estrutura obrigatoria do texto dentro de feedbackText:");
        lines.Add("ANALISE DO DIA:");
        lines.Add("PADRAO OBSERVADO:");
        lines.Add("EVOLUCAO DO COMPORTAMENTO:");
        lines.Add("GATILHO IDENTIFICADO:");
        lines.Add("CONSEQUENCIA:");
        lines.Add("SABEDORIA JUDAICA:");
        lines.Add("DIRECAO PRATICA:");

        lines.Add(string.Empty);
        lines.Add("Retorne JSON com exatamente estas chaves:");
        lines.Add("{");
        lines.Add("  \"detectedEmotion\": \"...\",");
        lines.Add("  \"triggerType\": \"...\",");
        lines.Add("  \"observedPattern\": \"...\",");
        lines.Add("  \"detectedTrigger\": \"...\",");
        lines.Add("  \"emotionalPattern\": \"...\",");
        lines.Add("  \"financialRisk\": \"...\",");
        lines.Add("  \"jewishWisdom\": \"...\",");
        lines.Add("  \"practicalAction\": \"...\",");
        lines.Add("  \"feedbackText\": \"...\"");
        lines.Add("}");

        lines.Add(string.Empty);
        lines.Add("Regras: nao use linguagem clinica; use 'possivel', 'tendencia observada'. "
            + "detectedTrigger deve ser curto (3-8 palavras). "
            + "practicalAction deve ser 1 acao concreta e pequena para as proximas 24h. "
            + "feedbackText deve ser humano, estrategico, sem moralismo, e terminar com 1 frase final do Rabino Mentor.");

        return string.Join("\n", lines);
    }

    private static MentorDailyFeedbackGenerateResponse BuildDailyFeedbackFallback(
        MentorDailyFeedbackGenerateRequest request,
        int dayNumber)
    {
        var trigger = string.IsNullOrWhiteSpace(request.TriggerText)
            ? "possivel tendencia de recompensa imediata"
            : "possivel sinal comportamental ligado a " + ApiMappers.Clean(request.TriggerText);

        return new MentorDailyFeedbackGenerateResponse(
            DetectedTrigger: trigger,
            EmotionalPattern: "Uma tendencia observada de oscilacao emocional ao longo do dia, com necessidade de alivio rapido.",
            FinancialRisk: "Se esse padrao continuar, pode aumentar gastos por impulso e enfraquecer sua base de prudencia.",
            JewishWisdom:
                "A sabedoria judaica valoriza construir antes de expandir: primeiro a base (reserva, clareza), depois o crescimento. "
                + "Forca nao e ausencia de desejo, e governo sobre ele.",
            PracticalAction:
                "Amanha, antes de qualquer compra nao planejada, faca uma pausa de 90 segundos e escreva: 'o que eu quero aliviar agora?'. "
                + "Adie por 24h 1 gasto que costuma ser automatico.",
            FeedbackText:
                $"Dia {dayNumber}: voce esta aprendendo a nomear o impulso sem se condenar. Isso ja e dominio proprio. "
                + "O dinheiro segue a consciencia: onde ha clareza, ha governo.\n\n"
                + "Frase do Rabino Mentor: 'A disciplina de hoje e o legado de amanha.'",
            DetectedEmotion: string.Empty,
            TriggerType: string.Empty,
            ObservedPattern: string.Empty);
    }

    private static MentorDailyFeedbackGenerateResponse EnsureDailyFeedbackSignals(
        MentorDailyFeedbackGenerateResponse parsed,
        MentorDailyFeedbackGenerateRequest request)
    {
        var detectedEmotion = NormalizeSignal(parsed.DetectedEmotion);
        var triggerType = NormalizeSignal(parsed.TriggerType);
        var observedPattern = NormalizeSignal(parsed.ObservedPattern);

        if (string.IsNullOrWhiteSpace(detectedEmotion))
            detectedEmotion = InferEmotion(ApiMappers.Clean(request.EmotionText), ApiMappers.Clean(request.TriggerText), ApiMappers.Clean(request.ReflectionText));
        if (string.IsNullOrWhiteSpace(triggerType))
            triggerType = InferTriggerType(ApiMappers.Clean(request.TriggerText), ApiMappers.Clean(request.EmotionText), ApiMappers.Clean(request.ReflectionText));
        if (string.IsNullOrWhiteSpace(observedPattern))
            observedPattern = InferObservedPattern(ApiMappers.Clean(request.EmotionText), ApiMappers.Clean(request.TriggerText), ApiMappers.Clean(request.ReflectionText));

        detectedEmotion = ConstrainToAllowedEmotion(detectedEmotion);
        triggerType = ConstrainToAllowedTriggerType(triggerType);
        observedPattern = ConstrainToAllowedPattern(observedPattern);

        return new MentorDailyFeedbackGenerateResponse(
            parsed.DetectedTrigger,
            parsed.EmotionalPattern,
            parsed.FinancialRisk,
            parsed.JewishWisdom,
            parsed.PracticalAction,
            parsed.FeedbackText,
            detectedEmotion,
            triggerType,
            observedPattern);
    }

    private static string BuildHistorySignalsBlock(IReadOnlyList<MentorDailyFeedback> history)
    {
        if (history.Count == 0)
            return "(sem historico ainda; trate como sinal inicial)";

        var emotionCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var triggerCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var patternCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var h in history)
        {
            AddCount(emotionCounts, NormalizeSignal(h.DetectedEmotion));
            AddCount(triggerCounts, NormalizeSignal(h.TriggerType));
            AddCount(patternCounts, NormalizeSignal(h.ObservedPattern));
        }

        var last = history
            .OrderByDescending(x => x.DayNumber)
            .Take(7)
            .OrderBy(x => x.DayNumber)
            .Select(x => new { dia = x.DayNumber, emocao = x.DetectedEmotion, gatilho = x.TriggerType, padrao = x.ObservedPattern })
            .ToArray();

        var summary = new
        {
            totalDias = history.Count,
            topEmocoes = Top3(emotionCounts),
            topGatilhos = Top3(triggerCounts),
            topPadroes = Top3(patternCounts),
            ultimos7Dias = last,
        };

        return JsonSerializer.Serialize(summary);
    }

    private static void AddCount(Dictionary<string, int> map, string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return;
        map.TryGetValue(key, out var cur);
        map[key] = cur + 1;
    }

    private static string[] Top3(Dictionary<string, int> map)
    {
        return map
            .OrderByDescending(x => x.Value)
            .ThenBy(x => x.Key)
            .Take(3)
            .Select(x => $"{x.Key} ({x.Value})")
            .ToArray();
    }

    private static string NormalizeSignal(string? value) => (value ?? string.Empty).Trim();

    private static string InferEmotion(string? emotionText, string? triggerText, string? reflectionText)
    {
        var text = string.Join(" ", new[] { emotionText, triggerText, reflectionText }).ToLowerInvariant();
        if (text.Contains("ansied") || text.Contains("apreens") || text.Contains("nervos")) return "ansiedade";
        if (text.Contains("carenc") || text.Contains("sozinh") || text.Contains("vazio") || text.Contains("aband")) return "carencia";
        if (text.Contains("stress") || text.Contains("estress") || text.Contains("cansad") || text.Contains("pressa")) return "estresse";
        if (text.Contains("frustra") || text.Contains("raiva") || text.Contains("irrit") || text.Contains("injust")) return "frustracao";
        if (text.Contains("tedio") || text.Contains("entedi")) return "tedio";
        if (text.Contains("recomp") || text.Contains("merec") || text.Contains("premiar") || text.Contains("prazer")) return "necessidade de recompensa";
        return string.Empty;
    }

    private static string InferTriggerType(string? triggerText, string? emotionText, string? reflectionText)
    {
        var text = string.Join(" ", new[] { triggerText, emotionText, reflectionText }).ToLowerInvariant();
        if (text.Contains("status") || text.Contains("impress") || text.Contains("valid") || text.Contains("aprov")) return "validacao social";
        if (text.Contains("fuga") || text.Contains("escapar") || text.Contains("anestes") || text.Contains("evitar")) return "fuga emocional";
        if (text.Contains("impuls") || text.Contains("na hora") || text.Contains("agora") || text.Contains("nao resist")) return "impulso imediato";
        if (text.Contains("escasse") || text.Contains("promo") || text.Contains("so hoje") || text.Contains("ultima") || text.Contains("sair do ar")) return "escassez falsa";
        if (text.Contains("recomp") || text.Contains("merec") || text.Contains("me dar") || text.Contains("me present")) return "recompensa emocional";
        if (text.Contains("compar") || text.Contains("instagram") || text.Contains("outros")) return "comparacao social";
        if (text.Contains("fomo") || text.Contains("perder") || text.Contains("oportun") || text.Contains("chance")) return "medo de perder oportunidade";
        if (text.Contains("descontrol") || text.Contains("bagunc") || text.Contains("sem limite") || text.Contains("sem plan")) return "descontrole financeiro";
        return string.Empty;
    }

    private static string InferObservedPattern(string? emotionText, string? triggerText, string? reflectionText)
    {
        var text = string.Join(" ", new[] { emotionText, triggerText, reflectionText }).ToLowerInvariant();

        if (text.Contains("culpa") || (text.Contains("aliv") && text.Contains("culp")))
            return "ciclo: emocao -> gasto -> alivio -> culpa";

        if (text.Contains("status") || text.Contains("identidade") || text.Contains("impress") || text.Contains("parecer"))
            return "busca de identidade/status";

        if (text.Contains("automatic") || text.Contains("sem pensar") || text.Contains("no piloto") || text.Contains("rotina"))
            return "consumo automatico";

        if (!string.IsNullOrWhiteSpace(emotionText) || !string.IsNullOrWhiteSpace(triggerText))
            return "compra para aliviar emocao";

        return string.Empty;
    }

    private static string ConstrainToAllowedEmotion(string value)
    {
        return value.ToLowerInvariant() switch
        {
            "ansiedade" => "ansiedade",
            "carencia" => "carencia",
            "estresse" => "estresse",
            "frustracao" => "frustracao",
            "tédio" => "tedio",
            "tedio" => "tedio",
            "necessidade de recompensa" => "necessidade de recompensa",
            _ => string.Empty,
        };
    }

    private static string ConstrainToAllowedTriggerType(string value)
    {
        var v = value.ToLowerInvariant();
        return v switch
        {
            "validacao social" => "validacao social",
            "validação social" => "validacao social",
            "fuga emocional" => "fuga emocional",
            "impulso imediato" => "impulso imediato",
            "escassez falsa" => "escassez falsa",
            "recompensa emocional" => "recompensa emocional",
            "comparacao social" => "comparacao social",
            "comparação social" => "comparacao social",
            "medo de perder oportunidade" => "medo de perder oportunidade",
            "descontrole financeiro" => "descontrole financeiro",
            _ => string.Empty,
        };
    }

    private static string ConstrainToAllowedPattern(string value)
    {
        var v = value.ToLowerInvariant();
        return v switch
        {
            "compra para aliviar emocao" => "compra para aliviar emocao",
            "ciclo: emocao -> gasto -> alivio -> culpa" => "ciclo: emocao -> gasto -> alivio -> culpa",
            "busca de identidade/status" => "busca de identidade/status",
            "consumo automatico" => "consumo automatico",
            _ => string.Empty,
        };
    }

    private static async Task<string> BuildProgressiveProfileSummaryAsync(
        AppDbContext dbContext,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var rows = await dbContext.MentorDailyFeedbacks
            .Where(x => x.UserId == userId && x.Phase == "21d")
            .OrderBy(x => x.DayNumber)
            .Take(21)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
            return "(sem sinais acumulados no banco)";

        var emotionCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var triggerCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var patternCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var r in rows)
        {
            AddCount(emotionCounts, NormalizeSignal(r.DetectedEmotion));
            AddCount(triggerCounts, NormalizeSignal(r.TriggerType));
            AddCount(patternCounts, NormalizeSignal(r.ObservedPattern));
        }

        var summary = new
        {
            totalDias = rows.Count,
            topEmocoes = Top3(emotionCounts),
            topGatilhos = Top3(triggerCounts),
            topPadroes = Top3(patternCounts),
            sinaisPorDia = rows.Select(x => new { dia = x.DayNumber, emocao = x.DetectedEmotion, gatilho = x.TriggerType, padrao = x.ObservedPattern }).ToArray(),
        };

        return JsonSerializer.Serialize(summary);
    }

    private static string BuildFinalReportPromptPayload(MentorFinalReportGenerateRequest request, string progressiveProfileSignals)
    {
        // Keep payload compact; the AI can infer patterns from JSON blocks.
        var progress = request.AllDaysProgress?.GetRawText() ?? "null";
        var daily = request.DailyFeedbacks?.GetRawText() ?? "null";
        var reflections = request.Reflections?.GetRawText() ?? "null";
        var triggers = request.Triggers?.GetRawText() ?? "null";
        var emotions = request.Emotions?.GetRawText() ?? "null";

        return string.Join("\n", new[]
        {
            "Gere um relatorio especial ao concluir o dia 21.",
            "Titulo do relatorio: 'Relatorio Rabinico da Sua Jornada Financeira'.",
            "Esse relatorio NAO e o feedback diario comum: ele consolida 21 dias e revela padroes.",
            "Analise obrigatoria (use o que estiver nos dados): rotina durante os 21 dias; tarefas executadas/parciais/nao executadas; reflexoes escritas; emocoes relatadas; gatilhos informados; feedbacks anteriores da IA; padrao mental dominante; principal gatilho financeiro que leva a gastar; risco de voltar ao padrao antigo se parar agora.",
            "Escreva uma mensagem persuasiva e personalizada, elegante e humana, sem parecer venda direta.",
            "Estrutura obrigatoria do texto (use marcadores A-F):",
            "A) Abertura forte (use esta ideia central): 'Durante 21 dias, seus registros revelaram algo que muitas pessoas passam anos sem enxergar: o dinheiro nao e perdido apenas no caixa. Ele comeca a ser perdido nos impulsos, nas emocoes e nas decisoes automaticas.'",
            "B) Diagnostico: aponte 1 padrao mental dominante (ex.: gasto por ansiedade, busca de status, recompensa imediata, medo de escassez, fuga emocional, culpa, comparacao, prazer instantaneo, desejo de aprovacao, desorganizacao financeira).",
            "C) Gatilho principal: 'Seu principal gatilho observado foi: [gatilho]'.",
            "D) Interpretacao judaica: conecte com dominio proprio, disciplina diaria, prudencia, legado, prosperidade como fruto de repeticao e riqueza em fases.",
            "E) Virada: explique que os 21 dias mostraram o mapa e a proxima fase trata e domina o problema. Inclua: 'Os 21 dias mostraram o mapa. Agora comeca a fase em que voce deixa de apenas identificar seus impulsos e passa a governa-los.'",
            "F) Oferta natural (sem palavra 'assinatura'): apresente 'Trilha Chodesh HaMelech — O Mes do Dominio Financeiro' como continuacao natural; finalize com CTA textual: 'Desbloquear minha Trilha Chodesh HaMelech'.",
            "Nao use a palavra 'assinatura' no reportText nem no offerBlock.",
            "Responda APENAS com JSON com estas chaves:",
            "{",
            "  \"reportText\": \"...\",",
            "  \"topTriggers\": [\"...\", \"...\", \"...\"],",
            "  \"emotionalPattern\": \"...\",",
            "  \"financialRiskPattern\": \"...\",",
            "  \"nextStepRecommendation\": \"...\",",
            "  \"offerBlock\": \"...\"",
            "}",
            "Dados:",
            "allDaysProgress=" + progress,
            "dailyFeedbacks=" + daily,
            "reflections=" + reflections,
            "triggers=" + triggers,
            "emotions=" + emotions,
            "progressiveProfileSignals=" + (progressiveProfileSignals ?? "null"),
            "Importante: oferta deve soar como continuacao natural, nao venda agressiva.",
        });
    }

    private static MentorFinalReportGenerateResponse BuildFinalReportFallback()
    {
        return new MentorFinalReportGenerateResponse(
            ReportText:
                "A) Abertura forte\nDurante 21 dias, seus registros revelaram algo que muitas pessoas passam anos sem enxergar: o dinheiro nao e perdido apenas no caixa. Ele comeca a ser perdido nos impulsos, nas emocoes e nas decisoes automaticas.\n\n"
                + "B) Diagnostico\nUm possivel padrao dominante observado e a busca de alivio rapido (recompensa imediata) quando ha pressao ou cansaco.\n\n"
                + "C) Gatilho principal\nSeu principal gatilho observado foi: recompensa imediata.\n\n"
                + "D) Interpretacao judaica\nNa sabedoria judaica, prosperidade nasce de governo sobre si: disciplina diaria, prudencia e construcao de base antes de expandir.\n\n"
                + "E) Virada\nOs 21 dias mostraram o mapa. Agora comeca a fase em que voce deixa de apenas identificar seus impulsos e passa a governa-los.\n\n"
                + "F) Oferta natural\n" + BuildDefaultOfferBlock(),
            TopTriggers: ["ansiedade", "recompensa imediata", "comparacao social"],
            EmotionalPattern: "Uma tendencia observada de buscar alivio rapido em dias de pressao.",
            FinancialRiskPattern: "Risco de gastos por impulso se o padrao nao for governado.",
            NextStepRecommendation: "Entre em Chodesh HaMelech para construir dominio: limites, rituais de pausa e compromissos pequenos.",
            OfferBlock: BuildDefaultOfferBlock());
    }

    private static string BuildDefaultOfferBlock()
    {
        return "Trilha Chodesh HaMelech — O Mes do Dominio Financeiro\n"
            + "Os 21 dias revelaram seus gatilhos. Agora voce entra na fase de tratamento e dominio, com rotina, pausas, limites e consistencia.\n\n"
            + "Opcoes para continuar:\n"
            + "- Acesso mensal a trilha: R$ 37,90\n"
            + "- Jornada Anual Shnat HaKatzir: R$ 397,90 (economia de R$ 56,90 vs 12 meses do mensal; ~12,5% de desconto)\n"
            + "- Legado Vitalicio Brit HaOsher: R$ 497,90 (melhor escolha para quem quer acesso definitivo)\n\n"
            + "CTA: Desbloquear minha Trilha Chodesh HaMelech";
    }

    private static IReadOnlyList<string> SafeParseStringList(string json)
    {
        try
        {
            var arr = JsonSerializer.Deserialize<string[]>(json ?? "[]");
            return arr ?? Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }
}
