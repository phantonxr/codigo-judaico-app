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

            if (!AppAccessEvaluator.HasPremiumAccess(user))
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

            if (!AppAccessEvaluator.HasPremiumAccess(user) && AppAccessEvaluator.HasPendingCheckout(user))
            {
                return Results.Json(
                    new LoginBlockedResponse(
                        "checkout_required",
                        BuildBlockedLoginMessage(user.PlanStatus),
                        user.Email,
                        AppAccessEvaluator.ResolvePlanId(user.PlanName),
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

        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest request,
            AppDbContext dbContext,
            SessionTokenService sessionTokenService,
            AccessEmailService accessEmailService,
            CancellationToken cancellationToken) =>
        {
            var email = ApiMappers.NormalizeEmail(request.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return Results.Ok();
            }

            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
            if (user is null)
            {
                return Results.Ok();
            }

            var rawToken = sessionTokenService.GenerateToken();
            user.PasswordResetTokenHash = sessionTokenService.HashToken(rawToken);
            user.PasswordResetTokenExpiresAt = DateTimeOffset.UtcNow.AddHours(2);
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

            await accessEmailService.SendPasswordResetEmailAsync(user, rawToken, cancellationToken);
            return Results.Ok();
        })
        .WithName("ForgotPassword");

        group.MapPost("/reset-password", async (
            ResetPasswordRequest request,
            AppDbContext dbContext,
            SessionTokenService sessionTokenService,
            PasswordHashService passwordHashService,
            CancellationToken cancellationToken) =>
        {
            var token = request.Token?.Trim() ?? string.Empty;
            var password = request.NewPassword?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(password))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["request"] = ["Informe token e nova senha."]
                });
            }

            if (password.Length < 8)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["newPassword"] = ["A nova senha deve ter ao menos 8 caracteres."]
                });
            }

            var tokenHash = sessionTokenService.HashToken(token);
            var now = DateTimeOffset.UtcNow;

            var user = await dbContext.Users.SingleOrDefaultAsync(
                x => x.PasswordResetTokenHash == tokenHash && x.PasswordResetTokenExpiresAt != null,
                cancellationToken);

            if (user is null || user.PasswordResetTokenExpiresAt < now)
            {
                return Results.Problem(
                    title: "Link invalido ou expirado.",
                    detail: "Solicite um novo link de recuperacao para redefinir sua senha.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            user.PasswordHash = passwordHashService.HashPassword(password);
            user.PasswordResetTokenHash = string.Empty;
            user.PasswordResetTokenExpiresAt = null;
            user.UpdatedAt = now;

            await dbContext.SaveChangesAsync(cancellationToken);
            return Results.Ok();
        })
        .WithName("ResetPassword");

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

}
