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

        group.MapPost("/rabino-mentor", async (
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

        group.MapPost("/rabino-daily-feedback", async (
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

        mentorGroup.MapGet("/daily-feedback", async (
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
                existing.FeedbackText));
        });

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

        mentorGroup.MapGet("/usage", async (
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

        mentorGroup.MapPost("/chat", async (
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

        mentorGroup.MapPost("/daily-feedback", async (
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
                    existing.FeedbackText));
            }

            MentorDailyFeedbackGenerateResponse? parsed = null;

            if (openAiClient.IsConfigured)
            {
                var userPayload = BuildDailyFeedbackPromptPayload(request, phase, dayNumber);
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

            var now = DateTimeOffset.UtcNow;
            dbContext.MentorDailyFeedbacks.Add(new MentorDailyFeedback
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Phase = phase,
                DayNumber = dayNumber,
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

        mentorGroup.MapGet("/final-report", async (
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
            return Results.Ok(new MentorFinalReportGenerateResponse(
                existing.ReportText,
                topTriggers,
                existing.EmotionalPattern,
                existing.FinancialRiskPattern,
                existing.NextStepRecommendation,
                OfferBlock: BuildDefaultOfferBlock()));
        });

        mentorGroup.MapPost("/final-report", async (
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
                return Results.Ok(new MentorFinalReportGenerateResponse(
                    existing.ReportText,
                    topTriggers,
                    existing.EmotionalPattern,
                    existing.FinancialRiskPattern,
                    existing.NextStepRecommendation,
                    OfferBlock: BuildDefaultOfferBlock()));
            }

            MentorFinalReportGenerateResponse? parsed = null;

            if (openAiClient.IsConfigured)
            {
                var system = BuildMentorSystemForFinalReport();
                var payload = BuildFinalReportPromptPayload(request);
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
            return Results.Ok(parsed);
        });

        return app;
    }

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
        return "Voce e o Rabino Mentor IA do Codigo Judaico da Prosperidade. "
            + "Tonalidade: rabino sabio, firme, humano e acolhedor. "
            + "Nao diagnostique clinicamente. Use termos como 'possivel padrao', 'sinal comportamental', 'tendencia observada'. "
            + "Conecte financas, dominio proprio, prudencia, legado e construcao patrimonial. "
            + "Evite repetir sempre 'Shalom'.";
    }

    private static string BuildMentorSystemForFinalReport()
    {
        return "Voce e o Rabino Mentor IA do Codigo Judaico da Prosperidade. "
            + "Gere um relatorio final da jornada de 21 dias com sabedoria judaica aplicada e linguagem premium. "
            + "Nao diagnostique clinicamente e nao prometa riqueza garantida. "
            + "Evite repetir sempre 'Shalom'.";
    }

    private static string BuildDailyFeedbackPromptPayload(
        MentorDailyFeedbackGenerateRequest request,
        string phase,
        int dayNumber)
    {
        var completed = request.CompletedTasks ?? Array.Empty<string>();
        var partial = request.PartialTasks ?? Array.Empty<string>();
        var notDone = request.NotCompletedTasks ?? Array.Empty<string>();

        var lines = new List<string>
        {
            "Contexto:",
            $"- Fase atual: {phase}",
            $"- Dia da jornada: {dayNumber}",
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
        lines.Add("Retorne JSON com exatamente estas chaves:");
        lines.Add("{");
        lines.Add("  \"detectedTrigger\": \"...\",");
        lines.Add("  \"emotionalPattern\": \"...\",");
        lines.Add("  \"financialRisk\": \"...\",");
        lines.Add("  \"jewishWisdom\": \"...\",");
        lines.Add("  \"practicalAction\": \"...\",");
        lines.Add("  \"feedbackText\": \"...\"");
        lines.Add("}");

        lines.Add(string.Empty);
        lines.Add("Regras: nao use linguagem clinica; use 'possivel', 'tendencia observada'. "
            + "Inclua no feedbackText uma frase final de reforco do Rabino Mentor.");

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
                + "Frase do Rabino Mentor: 'A disciplina de hoje e o legado de amanha.'");
    }

    private static string BuildFinalReportPromptPayload(MentorFinalReportGenerateRequest request)
    {
        // Keep payload compact; the AI can infer patterns from JSON blocks.
        var progress = request.AllDaysProgress?.GetRawText() ?? "null";
        var daily = request.DailyFeedbacks?.GetRawText() ?? "null";
        var reflections = request.Reflections?.GetRawText() ?? "null";
        var triggers = request.Triggers?.GetRawText() ?? "null";
        var emotions = request.Emotions?.GetRawText() ?? "null";

        return string.Join("\n", new[]
        {
            "Gere o 'Relatorio Rabinico da Sua Vida Financeira' ao final de 21 dias.",
            "Baseie-se no progresso, tarefas, reflexoes, emocoes, gatilhos e feedbacks diarios.",
            "Inclua as secoes A-G conforme pedido (abertura emocional, resumo, mapa de gatilhos, interpretacao, ponto de virada, proxima etapa, oferta natural).",
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
            "Importante: oferta deve soar como continuacao natural, nao venda agressiva.",
        });
    }

    private static MentorFinalReportGenerateResponse BuildFinalReportFallback()
    {
        return new MentorFinalReportGenerateResponse(
            ReportText:
                "A) Abertura emocional\nDurante 21 dias, voce expôs com honestidade sinais comportamentais e tendencias observadas na sua relacao com dinheiro.\n\n"
                + "B) Resumo da jornada\nVoce concluiu a etapa inicial — agora enxerga seus gatilhos com mais clareza.\n\n"
                + "C) Mapa dos gatilhos\nAnsiedade, recompensa imediata e comparacao social apareceram como possibilidades recorrentes.\n\n"
                + "D) Interpretacao do Rabino Mentor\nO que se repete nao e azar: e padrao. E o padrao pode ser governado com disciplina e prudencia.\n\n"
                + "E) Ponto de virada\nOs 21 dias foram o diagnostico. Agora voce sabe o que te puxa para o gasto — o proximo passo e dominar esse impulso.\n\n"
                + "F) Proxima etapa natural\nTrilha Chodesh HaMelech — O Mes do Dominio Financeiro\nDepois de enxergar seus gatilhos, o proximo passo e aprender a governa-los.\n\n"
                + "G) Oferta natural\n" + BuildDefaultOfferBlock(),
            TopTriggers: ["ansiedade", "recompensa imediata", "comparacao social"],
            EmotionalPattern: "Uma tendencia observada de buscar alivio rapido em dias de pressao.",
            FinancialRiskPattern: "Risco de gastos por impulso se o padrao nao for governado.",
            NextStepRecommendation: "Entre em Chodesh HaMelech para construir dominio: limites, rituais de pausa e compromissos pequenos.",
            OfferBlock: BuildDefaultOfferBlock());
    }

    private static string BuildDefaultOfferBlock()
    {
        return "Continuar com Chodesh HaMelech — R$ 37,90/mes\n"
            + "Escolher jornada anual — R$ 297/ano\n"
            + "(equivale a R$ 24,75/mes; economia de R$ 157,80 ao ano vs mensal)";
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
