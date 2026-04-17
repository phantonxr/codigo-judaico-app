using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Services;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using Stripe;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Endpoints;

public static class PaymentEndpoints
{
    private const int MinimumCheckoutPasswordLength = 8;
    private const string PendingCheckoutPlanStatus = "Checkout pendente";

    public static IEndpointRouteBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments").WithTags("Payments");

        group.MapPost("/checkout-sessions", async (
            CheckoutSessionCreateRequest request,
            AppDbContext dbContext,
            PasswordHashService passwordHashService,
            StripeBillingService stripeBillingService,
            CancellationToken cancellationToken) =>
        {
            var email = ApiMappers.NormalizeEmail(request.Email);
            var password = request.Password ?? string.Empty;

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

            if (string.IsNullOrWhiteSpace(password) || password.Trim().Length < MinimumCheckoutPasswordLength)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["password"] = [$"Crie uma senha com pelo menos {MinimumCheckoutPasswordLength} caracteres."]
                });
            }

            var plan = await stripeBillingService.GetValidatedPlanAsync(request.PlanId, cancellationToken);
            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

            if (user?.AccessEnabled == true)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["Este e-mail ja possui acesso liberado. Entre no login para continuar."]
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

            user.PasswordHash = passwordHashService.HashPassword(password.Trim());
            user.AccessEnabled = false;
            user.PlanName = plan.PlanName;
            user.PlanStatus = PendingCheckoutPlanStatus;
            user.LastStripeCheckoutSessionId = string.Empty;
            user.UpdatedAt = now;

            await dbContext.SaveChangesAsync(cancellationToken);

            var response = await stripeBillingService.CreateCheckoutSessionAsync(
                request with { Email = email, Password = string.Empty },
                plan,
                cancellationToken);

            user.LastStripeCheckoutSessionId = response.SessionId;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

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
}
