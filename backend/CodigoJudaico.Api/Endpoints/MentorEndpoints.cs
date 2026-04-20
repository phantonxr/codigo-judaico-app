using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class MentorEndpoints
{
    public static IEndpointRouteBuilder MapMentorEndpoints(this IEndpointRouteBuilder app)
    {
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

        return app;
    }
}
