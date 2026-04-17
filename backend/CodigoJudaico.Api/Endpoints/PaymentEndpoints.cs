using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Services;
using Stripe;

namespace CodigoJudaico.Api.Endpoints;

public static class PaymentEndpoints
{
    public static IEndpointRouteBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments").WithTags("Payments");

        group.MapPost("/checkout-sessions", async (
            CheckoutSessionCreateRequest request,
            StripeBillingService stripeBillingService,
            CancellationToken cancellationToken) =>
        {
            var email = ApiMappers.NormalizeEmail(request.Email);

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

            var response = await stripeBillingService.CreateCheckoutSessionAsync(
                request with { Email = email },
                cancellationToken);

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
