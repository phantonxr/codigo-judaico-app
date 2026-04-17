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
        var group = app.MapGroup("/api").WithTags("Mentor").RequireAuthorization();

        group.MapPost("/rabino-mentor", async (
            ClaimsPrincipal userPrincipal,
            MentorChatRequest request,
            AppDbContext dbContext,
            MentorFallbackService fallbackService,
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

            var reply = fallbackService.BuildMentorReply(message, request.CurrentPlan);
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

        group.MapPost("/rabino-daily-feedback", (
            DailyFeedbackRequest request,
            MentorFallbackService fallbackService) =>
        {
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
        })
        .RequireAuthorization();

        return app;
    }
}
