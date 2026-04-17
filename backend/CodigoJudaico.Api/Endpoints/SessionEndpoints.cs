using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", async (
            LoginRequest request,
            AppDbContext dbContext,
            PasswordHashService passwordHashService,
            SessionTokenService sessionTokenService,
            StripeWebhookProcessor stripeWebhookProcessor,
            CancellationToken cancellationToken) =>
        {
            var email = ApiMappers.NormalizeEmail(request.Email);

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["credentials"] = ["Informe e-mail e senha para entrar."]
                });
            }

            var user = await dbContext.Users
                .Include(x => x.Diagnosis)
                .Include(x => x.JourneyState)
                .Include(x => x.LessonProgressEntries)
                .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

            if (user is null ||
                string.IsNullOrWhiteSpace(user.PasswordHash) ||
                !passwordHashService.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Results.Problem(
                    title: "Credenciais invalidas.",
                    detail: "Confirme o e-mail, a senha ou a liberacao do seu acesso.",
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            if (!user.AccessEnabled)
            {
                if (!string.IsNullOrWhiteSpace(user.LastStripeCheckoutSessionId))
                {
                    await stripeWebhookProcessor.TryReconcileCheckoutSessionAsync(
                        user.LastStripeCheckoutSessionId,
                        cancellationToken);

                    user = await dbContext.Users
                        .Include(x => x.Diagnosis)
                        .Include(x => x.JourneyState)
                        .Include(x => x.LessonProgressEntries)
                        .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
                }
            }

            if (user is null)
            {
                return Results.Problem(
                    title: "Credenciais invalidas.",
                    detail: "Confirme o e-mail, a senha ou a liberacao do seu acesso.",
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            if (!user.AccessEnabled)
            {
                return Results.Json(
                    new LoginBlockedResponse(
                        "checkout_required",
                        BuildBlockedLoginMessage(user.PlanStatus),
                        user.Email,
                        ResolvePlanId(user.PlanName),
                        user.PlanName,
                        user.PlanStatus),
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var token = sessionTokenService.GenerateToken();
            var now = DateTimeOffset.UtcNow;

            dbContext.AppSessions.Add(new AppSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = sessionTokenService.HashToken(token),
                CreatedAt = now,
                ExpiresAt = now.AddDays(30),
            });

            await dbContext.SaveChangesAsync(cancellationToken);

            var mentorMessages = await dbContext.MentorChatMessages
                .Where(x => x.UserId == user.Id)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return Results.Ok(new AuthenticatedSessionResponse(
                token,
                user.ToBootstrap(user.LessonProgressEntries, mentorMessages)));
        })
        .WithName("Login");

        group.MapGet("/session", async (
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();

            var user = await dbContext.Users
                .Include(x => x.Diagnosis)
                .Include(x => x.JourneyState)
                .Include(x => x.LessonProgressEntries)
                .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
            }

            var mentorMessages = await dbContext.MentorChatMessages
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return Results.Ok(user.ToBootstrap(user.LessonProgressEntries, mentorMessages));
        })
        .RequireAuthorization()
        .WithName("GetCurrentSession");

        group.MapPost("/logout", async (
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var sessionId = userPrincipal.GetRequiredSessionId();
            var session = await dbContext.AppSessions
                .SingleOrDefaultAsync(x => x.Id == sessionId, cancellationToken);

            if (session is null)
            {
                return Results.NoContent();
            }

            session.RevokedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        })
        .RequireAuthorization()
        .WithName("Logout");

        return app;
    }

    private static string BuildBlockedLoginMessage(string? planStatus)
    {
        return string.Equals(planStatus, "Checkout pendente", StringComparison.OrdinalIgnoreCase)
            ? "Sua conta ja foi criada, mas o pagamento ainda nao foi confirmado. Finalize o checkout para liberar o acesso."
            : "Seu acesso nao esta ativo no momento. Reative a assinatura no checkout para voltar a entrar.";
    }

    private static string? ResolvePlanId(string? planName)
    {
        var normalized = ApiMappers.Clean(planName).ToLowerInvariant();

        if (normalized.Contains("anual", StringComparison.Ordinal))
        {
            return "anual";
        }

        if (normalized.Contains("mensal", StringComparison.Ordinal))
        {
            return "mensal";
        }

        return null;
    }
}
