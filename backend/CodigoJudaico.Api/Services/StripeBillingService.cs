using CodigoJudaico.Api.Contracts;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace CodigoJudaico.Api.Services;

public sealed record StripePlanDefinition(
    string Id,
    string PlanName,
    string PriceId,
    string PromotionCouponId,
    bool IsOneTimePayment = false);

public sealed class StripeBillingService(IOptions<StripeBillingOptions> options)
{
    public const string AppKeyMetadataKey = "app_key";
    public const string ConnectedAccountMetadataKey = "connected_account_id";
    public const string CurrencyMetadataKey = "billing_currency";
    public const string PlanIdMetadataKey = "plan_id";
    public const string PlanNameMetadataKey = "plan_name";
    public const string EmailMetadataKey = "email";
    public const string NameMetadataKey = "name";

    private readonly StripeBillingOptions _options = options.Value;
    private readonly SessionService _checkoutSessions = new();
    private readonly SubscriptionService _subscriptions = new();
    private readonly PriceService _prices = new();

    public StripePlanDefinition GetPlan(string planId)
    {
        StripeConfiguration.ApiKey = _options.SecretKey;

        return ApiMappers.Clean(planId).ToLowerInvariant() switch
        {
            "primeiro-acesso" => BuildPlan("primeiro-acesso", _options.FirstAccess, "Primeiro Acesso", isOneTime: true),
            "renovacao" => BuildPlan("renovacao", _options.Renewal, "Renovacao Especial", isOneTime: true),
            "mensal" => BuildPlan("mensal", _options.Monthly, "Premium Mensal"),
            "anual" => BuildPlan("anual", _options.Annual, "Premium Anual"),
            "vitalicio" => BuildPlan("vitalicio", _options.Lifetime, "Acesso Vitalicio", isOneTime: true),
            _ => throw new InvalidOperationException("Plano do checkout nao reconhecido."),
        };
    }

    public async Task<StripePlanDefinition> GetValidatedPlanAsync(string planId, CancellationToken cancellationToken)
    {
        EnsureConfigured();

        var plan = GetPlan(planId);
        await EnsurePriceIsSupportedAsync(plan, cancellationToken);
        return plan;
    }

    public bool HasExpectedMetadata(Dictionary<string, string>? metadata)
    {
        if (metadata is null || metadata.Count == 0)
        {
            return false;
        }

        return string.Equals(ReadMetadata(metadata, AppKeyMetadataKey), ApplicationKey, StringComparison.OrdinalIgnoreCase)
            && string.Equals(ReadMetadata(metadata, ConnectedAccountMetadataKey), ConnectedAccountId, StringComparison.OrdinalIgnoreCase)
            && string.Equals(ReadMetadata(metadata, CurrencyMetadataKey), RequiredCurrency, StringComparison.OrdinalIgnoreCase);
    }

    public bool TryGetConfiguredPlanById(string? planId, out StripePlanDefinition plan)
    {
        plan = default!;
        var normalizedPlanId = Normalize(planId);

        foreach (var candidate in GetConfiguredPlans())
        {
            if (!string.Equals(candidate.Id, normalizedPlanId, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            plan = candidate;
            return true;
        }

        return false;
    }

    public async Task<StripePlanDefinition?> MatchSubscriptionAsync(
        Subscription? subscription,
        CancellationToken cancellationToken)
    {
        var expandedSubscription = await EnsureSubscriptionExpandedAsync(subscription, cancellationToken);

        if (expandedSubscription is null)
        {
            return null;
        }

        var firstPrice = expandedSubscription.Items?.Data?.FirstOrDefault()?.Price;

        if (!TryGetConfiguredPlanByPriceId(firstPrice?.Id, out var plan))
        {
            return null;
        }

        return string.Equals(Normalize(firstPrice?.Currency), RequiredCurrency, StringComparison.OrdinalIgnoreCase)
            ? plan
            : null;
    }

    public async Task<CheckoutSessionCreateResponse> CreateCheckoutSessionAsync(
        CheckoutSessionCreateRequest request,
        StripePlanDefinition plan,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();

        var email = ApiMappers.NormalizeEmail(request.Email);
        var name = ApiMappers.Clean(request.Name);
        var baseUrl = _options.FrontendBaseUrl.TrimEnd('/');
        var metadata = BuildCheckoutMetadata(email, name, plan);

        Session session;

        if (plan.IsOneTimePayment)
        {
            session = await CreateOneTimePaymentSessionAsync(email, baseUrl, metadata, plan, cancellationToken);
        }
        else
        {
            session = await CreateSubscriptionSessionAsync(email, baseUrl, metadata, plan, cancellationToken);
        }

        return new CheckoutSessionCreateResponse(session.Id, session.Url ?? string.Empty);
    }

    public async Task<Session> GetCheckoutSessionAsync(string sessionId, CancellationToken cancellationToken)
    {
        EnsureConfigured();

        return await _checkoutSessions.GetAsync(
            sessionId,
            new SessionGetOptions
            {
                Expand = ["subscription", "subscription.items.data.price", "customer"],
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
            new SubscriptionGetOptions
            {
                Expand = ["items.data.price"],
            },
            requestOptions: null,
            cancellationToken: cancellationToken);
    }

    public Event ConstructWebhookEvent(string payload, string signatureHeader)
    {
        EnsureConfigured();
        return EventUtility.ConstructEvent(payload, signatureHeader, _options.WebhookSecret);
    }

    private async Task<Session> CreateSubscriptionSessionAsync(
        string email,
        string baseUrl,
        Dictionary<string, string> metadata,
        StripePlanDefinition plan,
        CancellationToken cancellationToken)
    {
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
                ApplicationFeePercent = _options.PlatformRetentionPercent,
                TransferData = new SessionSubscriptionDataTransferDataOptions
                {
                    Destination = _options.ConnectedAccountId,
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

        return await _checkoutSessions.CreateAsync(
            sessionOptions,
            requestOptions: null,
            cancellationToken: cancellationToken);
    }

    private async Task<Session> CreateOneTimePaymentSessionAsync(
        string email,
        string baseUrl,
        Dictionary<string, string> metadata,
        StripePlanDefinition plan,
        CancellationToken cancellationToken)
    {
        var price = await _prices.GetAsync(
            plan.PriceId,
            options: null,
            requestOptions: null,
            cancellationToken: cancellationToken);

        var unitAmount = price?.UnitAmount ?? 0;
        var feeAmount = (long)Math.Round(unitAmount * (double)_options.PlatformRetentionPercent / 100m);

        var sessionOptions = new SessionCreateOptions
        {
            Mode = "payment",
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
            PaymentIntentData = new SessionPaymentIntentDataOptions
            {
                Metadata = metadata,
                ApplicationFeeAmount = feeAmount > 0 ? feeAmount : null,
                TransferData = new SessionPaymentIntentDataTransferDataOptions
                {
                    Destination = _options.ConnectedAccountId,
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

        return await _checkoutSessions.CreateAsync(
            sessionOptions,
            requestOptions: null,
            cancellationToken: cancellationToken);
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

    private Dictionary<string, string> BuildCheckoutMetadata(
        string email,
        string? name,
        StripePlanDefinition plan)
    {
        var metadata = new Dictionary<string, string>
        {
            [AppKeyMetadataKey] = ApplicationKey,
            [ConnectedAccountMetadataKey] = ConnectedAccountId,
            [CurrencyMetadataKey] = RequiredCurrency,
            [EmailMetadataKey] = email,
            [PlanIdMetadataKey] = plan.Id,
            [PlanNameMetadataKey] = plan.PlanName,
        };

        if (!string.IsNullOrWhiteSpace(name))
        {
            metadata[NameMetadataKey] = name;
        }

        return metadata;
    }

    private async Task EnsurePriceIsSupportedAsync(
        StripePlanDefinition plan,
        CancellationToken cancellationToken)
    {
        var price = await _prices.GetAsync(
            plan.PriceId,
            options: null,
            requestOptions: null,
            cancellationToken: cancellationToken);

        if (price is null)
        {
            throw new InvalidOperationException($"Stripe: Price '{plan.PriceId}' nao encontrado.");
        }

        if (!price.Active)
        {
            throw new InvalidOperationException($"Stripe: Price '{plan.PriceId}' esta inativo.");
        }

        if (!plan.IsOneTimePayment && price.Recurring is null)
        {
            throw new InvalidOperationException($"Stripe: Price '{plan.PriceId}' precisa ser recorrente.");
        }

        if (plan.IsOneTimePayment && price.Recurring is not null)
        {
            throw new InvalidOperationException($"Stripe: Price '{plan.PriceId}' deve ser de pagamento unico (nao recorrente).");
        }

        if (!string.Equals(Normalize(price.Currency), RequiredCurrency, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Stripe: Price '{plan.PriceId}' deve usar a moeda '{RequiredCurrency.ToUpperInvariant()}'.");
        }
    }

    private async Task<Subscription?> EnsureSubscriptionExpandedAsync(
        Subscription? subscription,
        CancellationToken cancellationToken)
    {
        if (subscription is null)
        {
            return null;
        }

        var firstPrice = subscription.Items?.Data?.FirstOrDefault()?.Price;

        if (!string.IsNullOrWhiteSpace(firstPrice?.Id) && !string.IsNullOrWhiteSpace(firstPrice.Currency))
        {
            return subscription;
        }

        return string.IsNullOrWhiteSpace(subscription.Id)
            ? subscription
            : await GetSubscriptionAsync(subscription.Id, cancellationToken);
    }

    private IEnumerable<StripePlanDefinition> GetConfiguredPlans()
    {
        var firstAccess = TryBuildPlan("primeiro-acesso", _options.FirstAccess, "Primeiro Acesso", isOneTime: true);
        if (firstAccess is not null) yield return firstAccess;

        var renewal = TryBuildPlan("renovacao", _options.Renewal, "Renovacao Especial", isOneTime: true);
        if (renewal is not null) yield return renewal;

        var monthly = TryBuildPlan("mensal", _options.Monthly, "Premium Mensal");
        if (monthly is not null) yield return monthly;

        var annual = TryBuildPlan("anual", _options.Annual, "Premium Anual");
        if (annual is not null) yield return annual;

        var lifetime = TryBuildPlan("vitalicio", _options.Lifetime, "Acesso Vitalicio", isOneTime: true);
        if (lifetime is not null) yield return lifetime;
    }

    private bool TryGetConfiguredPlanByPriceId(string? priceId, out StripePlanDefinition plan)
    {
        plan = default!;
        var normalizedPriceId = Normalize(priceId);

        foreach (var candidate in GetConfiguredPlans())
        {
            if (!string.Equals(candidate.PriceId, normalizedPriceId, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            plan = candidate;
            return true;
        }

        return false;
    }

    private static StripePlanDefinition BuildPlan(
        string planId,
        StripeCheckoutPlanOptions options,
        string fallbackPlanName,
        bool isOneTime = false)
    {
        if (string.IsNullOrWhiteSpace(options.PriceId))
        {
            throw new InvalidOperationException($"Stripe: plano '{planId}' sem PriceId configurado.");
        }

        return new StripePlanDefinition(
            planId,
            string.IsNullOrWhiteSpace(options.PlanName) ? fallbackPlanName : ApiMappers.Clean(options.PlanName),
            ApiMappers.Clean(options.PriceId),
            ApiMappers.Clean(options.PromotionCouponId),
            isOneTime);
    }

    private static StripePlanDefinition? TryBuildPlan(
        string planId,
        StripeCheckoutPlanOptions options,
        string fallbackPlanName,
        bool isOneTime = false)
    {
        return string.IsNullOrWhiteSpace(options.PriceId)
            ? null
            : BuildPlan(planId, options, fallbackPlanName, isOneTime);
    }

    private string ApplicationKey => Normalize(_options.ApplicationKey, "codigo-judaico");

    private string ConnectedAccountId => Normalize(_options.ConnectedAccountId);

    private string RequiredCurrency => Normalize(_options.RequiredCurrency, "brl");

    private static string ReadMetadata(Dictionary<string, string>? metadata, string key)
    {
        if (metadata is null || !metadata.TryGetValue(key, out var value))
        {
            return string.Empty;
        }

        return Normalize(value);
    }

    private static string Normalize(string? value, string fallback = "")
    {
        var cleaned = ApiMappers.Clean(value).ToLowerInvariant();
        return string.IsNullOrWhiteSpace(cleaned) ? fallback : cleaned;
    }
}
