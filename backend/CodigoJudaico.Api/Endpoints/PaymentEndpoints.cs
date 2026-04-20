using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Services;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using Stripe;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class PaymentEndpoints
{
    private const int MinimumCheckoutPasswordLength = 8;
    private const string PendingCheckoutPlanStatus = "Checkout pendente";

    public static IEndpointRouteBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments").WithTags("Payments");

        group.MapGet("/available-plans", async (
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            var plans = new List<AvailablePlanDto>();

            if (user is not null && user.AccessGrantedAt is not null && !user.HasUsedRenewalOffer)
            {
                plans.Add(new AvailablePlanDto(
                    "renovacao",
                    "Renovacao Especial",
                    "R$ 17,90",
                    "+ 21 dias de acesso",
                    "Oferta unica — nao se repete",
                    IsHighlighted: true));
            }

            plans.Add(new AvailablePlanDto("mensal", "Premium Mensal", "R$ 37,90", "por mes", "Renovacao automatica mensal", IsHighlighted: false));
            plans.Add(new AvailablePlanDto("anual", "Premium Anual", "R$ 297,90", "por ano", "Acesso por 12 meses", IsHighlighted: false));
            plans.Add(new AvailablePlanDto("vitalicio", "Acesso Vitalicio", "R$ 497,90", "pagamento unico", "Acesso permanente, sem renovacao", IsHighlighted: false));

            return Results.Ok(plans);
        })
        .RequireAuthorization()
        .WithName("GetAvailablePlans");

        group.MapPost("/checkout-sessions", async (
            CheckoutSessionCreateRequest request,
            AppDbContext dbContext,
            PasswordHashService passwordHashService,
            StripeBillingService stripeBillingService,
            AccessEmailService accessEmailService,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var logger = loggerFactory.CreateLogger("PaymentEndpoints");
            var email = ApiMappers.NormalizeEmail(request.Email);
            var password = request.Password ?? string.Empty;
            var trimmedPassword = password.Trim();

            if (string.IsNullOrWhiteSpace(email))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["Informe um e-mail valido para liberar o acesso."]
                });
            }

            if (string.IsNullOrWhiteSpace(ApiMappers.Clean(request.PlanId)))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["planId"] = ["Escolha um plano antes de continuar."]
                });
            }

            var plan = await stripeBillingService.GetValidatedPlanAsync(request.PlanId, cancellationToken);
            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

            var planEligibilityError = ValidatePlanEligibility(plan, user);

            if (planEligibilityError is not null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["planId"] = [planEligibilityError]
                });
            }

            if (user?.AccessEnabled == true
                && !string.Equals(plan.Id, "renovacao", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(plan.Id, "vitalicio", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(plan.Id, "mensal", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(plan.Id, "anual", StringComparison.OrdinalIgnoreCase))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["Este e-mail ja possui acesso liberado. Entre no login para continuar."]
                });
            }

            var shouldSendAccountCreatedEmail = user?.AccountCreatedEmailSentAt is null;
            var shouldRequireNewPassword = user is null || string.IsNullOrWhiteSpace(user.PasswordHash);

            if (shouldRequireNewPassword && trimmedPassword.Length < MinimumCheckoutPasswordLength)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["password"] = [$"Crie uma senha com pelo menos {MinimumCheckoutPasswordLength} caracteres."]
                });
            }

            var now = DateTimeOffset.UtcNow;

            if (user is null)
            {
                user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    Name = "Aluno",
                    CreatedAt = now,
                };

                dbContext.Users.Add(user);
            }

            var cleanedName = ApiMappers.Clean(request.Name);

            if (!string.IsNullOrWhiteSpace(cleanedName))
            {
                user.Name = cleanedName;
            }

            if (!string.IsNullOrWhiteSpace(trimmedPassword))
            {
                user.PasswordHash = passwordHashService.HashPassword(trimmedPassword);
            }

            user.AccessEnabled = false;
            user.PlanName = plan.PlanName;
            user.PlanStatus = PendingCheckoutPlanStatus;
            user.UpdatedAt = now;

            await dbContext.SaveChangesAsync(cancellationToken);

            var response = await stripeBillingService.CreateCheckoutSessionAsync(
                request with { Email = email, Password = string.Empty },
                plan,
                cancellationToken);

            if (shouldSendAccountCreatedEmail)
            {
                try
                {
                    await accessEmailService.SendAccountCreatedEmailAsync(user, cancellationToken);
                    user.AccountCreatedEmailSentAt = DateTimeOffset.UtcNow;
                    user.UpdatedAt = DateTimeOffset.UtcNow;
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Falha ao enviar e-mail de conta criada para {Email}. O checkout continuou normalmente.",
                        user.Email);
                }
            }

            return Results.Ok(response);
        })
        .WithName("CreateCheckoutSession");

        group.MapGet("/checkout-sessions/{sessionId}", async (
            string sessionId,
            StripeWebhookProcessor webhookProcessor,
            CancellationToken cancellationToken) =>
        {
            var status = await webhookProcessor.GetCheckoutStatusAsync(sessionId, cancellationToken);
            return status is null ? Results.NotFound() : Results.Ok(status);
        })
        .WithName("GetCheckoutSessionStatus");

        group.MapPost("/webhooks/stripe", async (
            HttpRequest request,
            StripeBillingService stripeBillingService,
            StripeWebhookProcessor webhookProcessor,
            CancellationToken cancellationToken) =>
        {
            using var reader = new StreamReader(request.Body);
            var payload = await reader.ReadToEndAsync(cancellationToken);
            var signature = request.Headers["Stripe-Signature"].ToString();

            if (string.IsNullOrWhiteSpace(signature))
            {
                return Results.BadRequest("Cabecalho Stripe-Signature ausente.");
            }

            Event stripeEvent;

            try
            {
                stripeEvent = stripeBillingService.ConstructWebhookEvent(payload, signature);
            }
            catch (StripeException ex)
            {
                return Results.BadRequest(ex.Message);
            }

            await webhookProcessor.ProcessAsync(stripeEvent, cancellationToken);
            return Results.Ok();
        })
        .WithName("StripeWebhook");

        return app;
    }

    private static string? ValidatePlanEligibility(StripePlanDefinition plan, AppUser? user)
    {
        if (string.Equals(plan.Id, "primeiro-acesso", StringComparison.OrdinalIgnoreCase)
            && user?.AccessGrantedAt is not null)
        {
            return "Voce ja utilizou o Primeiro Acesso. Escolha outro plano para continuar.";
        }

        if (string.Equals(plan.Id, "renovacao", StringComparison.OrdinalIgnoreCase)
            && (user is null || user.HasUsedRenewalOffer))
        {
            return "A Renovacao Especial ja foi utilizada ou nao esta disponivel para este e-mail.";
        }

        return null;
    }
}
