using CodigoJudaico.Api.Contracts;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace CodigoJudaico.Api.Services;

public sealed record StripePlanDefinition(
    string Id,
    string PlanName,
    string PriceId,
    string PromotionCouponId);

public sealed class StripeBillingService(IOptions<StripeBillingOptions> options)
{
    private readonly StripeBillingOptions _options = options.Value;
    private readonly SessionService _checkoutSessions = new();
    private readonly SubscriptionService _subscriptions = new();

    public StripePlanDefinition GetPlan(string planId)
    {
        StripeConfiguration.ApiKey = _options.SecretKey;

        return ApiMappers.Clean(planId).ToLowerInvariant() switch
        {
            "mensal" => BuildPlan("mensal", _options.Monthly, "Premium Mensal"),
            "anual" => BuildPlan("anual", _options.Annual, "Premium Anual"),
            _ => throw new InvalidOperationException("Plano do checkout nao reconhecido."),
        };
    }

    public async Task<CheckoutSessionCreateResponse> CreateCheckoutSessionAsync(
        CheckoutSessionCreateRequest request,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();

        var email = ApiMappers.NormalizeEmail(request.Email);
        var name = ApiMappers.Clean(request.Name);
        var plan = GetPlan(request.PlanId);
        var baseUrl = _options.FrontendBaseUrl.TrimEnd('/');

        var metadata = new Dictionary<string, string>
        {
            ["email"] = email,
            ["plan_id"] = plan.Id,
            ["plan_name"] = plan.PlanName,
        };

        if (!string.IsNullOrWhiteSpace(name))
        {
            metadata["name"] = name;
        }

        var sessionOptions = new SessionCreateOptions
        {
            Mode = "subscription",
            SuccessUrl = $"{baseUrl}/checkout/sucesso?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{baseUrl}/checkout/cancelado",
            CustomerEmail = email,
            ClientReferenceId = email,
            BillingAddressCollection = "required",
            Metadata = metadata,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Price = plan.PriceId,
                    Quantity = 1,
                },
            ],
            SubscriptionData = new SessionSubscriptionDataOptions
            {
                Description = plan.PlanName,
                Metadata = metadata,
                TransferData = new SessionSubscriptionDataTransferDataOptions
                {
                    Destination = _options.ConnectedAccountId,
                    AmountPercent = 100m - _options.PlatformRetentionPercent,
                },
            },
        };

        if (!string.IsNullOrWhiteSpace(plan.PromotionCouponId))
        {
            sessionOptions.Discounts =
            [
                new SessionDiscountOptions
                {
                    Coupon = plan.PromotionCouponId,
                },
            ];
        }

        var session = await _checkoutSessions.CreateAsync(
            sessionOptions,
            requestOptions: null,
            cancellationToken: cancellationToken);

        return new CheckoutSessionCreateResponse(session.Id, session.Url ?? string.Empty);
    }

    public async Task<Session> GetCheckoutSessionAsync(string sessionId, CancellationToken cancellationToken)
    {
        EnsureConfigured();

        return await _checkoutSessions.GetAsync(
            sessionId,
            new SessionGetOptions
            {
                Expand = ["subscription", "customer"],
            },
            requestOptions: null,
            cancellationToken: cancellationToken);
    }

    public async Task<Subscription?> GetSubscriptionAsync(string? subscriptionId, CancellationToken cancellationToken)
    {
        EnsureConfigured();

        if (string.IsNullOrWhiteSpace(subscriptionId))
        {
            return null;
        }

        return await _subscriptions.GetAsync(
            subscriptionId,
            options: null,
            requestOptions: null,
            cancellationToken: cancellationToken);
    }

    public Event ConstructWebhookEvent(string payload, string signatureHeader)
    {
        EnsureConfigured();
        return EventUtility.ConstructEvent(payload, signatureHeader, _options.WebhookSecret);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            throw new InvalidOperationException("Stripe:SecretKey nao configurada.");
        }

        if (string.IsNullOrWhiteSpace(_options.ConnectedAccountId))
        {
            throw new InvalidOperationException("Stripe:ConnectedAccountId nao configurada.");
        }

        if (string.IsNullOrWhiteSpace(_options.FrontendBaseUrl))
        {
            throw new InvalidOperationException("Stripe:FrontendBaseUrl nao configurada.");
        }

        StripeConfiguration.ApiKey = _options.SecretKey;
    }

    private static StripePlanDefinition BuildPlan(
        string planId,
        StripeCheckoutPlanOptions options,
        string fallbackPlanName)
    {
        if (string.IsNullOrWhiteSpace(options.PriceId))
        {
            throw new InvalidOperationException($"Stripe: plano '{planId}' sem PriceId configurado.");
        }

        return new StripePlanDefinition(
            planId,
            string.IsNullOrWhiteSpace(options.PlanName) ? fallbackPlanName : ApiMappers.Clean(options.PlanName),
            ApiMappers.Clean(options.PriceId),
            ApiMappers.Clean(options.PromotionCouponId));
    }
}
