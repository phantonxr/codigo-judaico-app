using Stripe.Checkout;

namespace CodigoJudaico.Api.Services;

internal sealed record PaymentCoreCheckoutMetadata(
    string AppId,
    string AppName,
    string TenantId,
    string SellerId,
    string SellerName,
    string OrderId);

internal sealed record StripeConnectRouting(
    string ConnectedAccountCountry,
    bool UseConnectSplit)
{
    internal static readonly StripeConnectRouting Direct = new(string.Empty, false);
}

internal static class StripeCheckoutSessionBuilder
{
    internal static Dictionary<string, string> BuildMetadata(
        string applicationKey,
        string connectedAccountId,
        string requiredCurrency,
        string email,
        string? name,
        StripePlanDefinition plan,
        PaymentCoreCheckoutMetadata paymentCoreMetadata,
        string? utmSource = null,
        string? utmMedium = null,
        string? utmCampaign = null,
        string? utmTerm = null,
        string? utmContent = null,
        string? bookIds = null)
    {
        EnsureRequiredPaymentCoreMetadata(paymentCoreMetadata);

        var metadata = new Dictionary<string, string>
        {
            [StripeBillingService.AppKeyMetadataKey] = applicationKey,
            [StripeBillingService.ConnectedAccountMetadataKey] = connectedAccountId,
            [StripeBillingService.CurrencyMetadataKey] = requiredCurrency,
            [StripeBillingService.EmailMetadataKey] = email,
            [StripeBillingService.PlanIdMetadataKey] = plan.Id,
            [StripeBillingService.PlanNameMetadataKey] = plan.PlanName,
            [StripeBillingService.AppIdMetadataKey] = paymentCoreMetadata.AppId,
            [StripeBillingService.AppNameMetadataKey] = paymentCoreMetadata.AppName,
            [StripeBillingService.TenantIdMetadataKey] = paymentCoreMetadata.TenantId,
            [StripeBillingService.SellerIdMetadataKey] = paymentCoreMetadata.SellerId,
            [StripeBillingService.SellerNameMetadataKey] = paymentCoreMetadata.SellerName,
            [StripeBillingService.OrderIdMetadataKey] = paymentCoreMetadata.OrderId,
        };

        if (!string.IsNullOrWhiteSpace(name))
        {
            metadata[StripeBillingService.NameMetadataKey] = name;
        }

        if (!string.IsNullOrWhiteSpace(utmSource))
            metadata[StripeBillingService.UtmSourceMetadataKey] = utmSource;
        if (!string.IsNullOrWhiteSpace(utmMedium))
            metadata[StripeBillingService.UtmMediumMetadataKey] = utmMedium;
        if (!string.IsNullOrWhiteSpace(utmCampaign))
            metadata[StripeBillingService.UtmCampaignMetadataKey] = utmCampaign;
        if (!string.IsNullOrWhiteSpace(utmTerm))
            metadata[StripeBillingService.UtmTermMetadataKey] = utmTerm;
        if (!string.IsNullOrWhiteSpace(utmContent))
            metadata[StripeBillingService.UtmContentMetadataKey] = utmContent;

        if (!string.IsNullOrWhiteSpace(bookIds))
            metadata[StripeBillingService.BookIdsMetadataKey] = bookIds;

        return metadata;
    }

    internal static SessionCreateOptions BuildSubscriptionSessionOptions(
        string email,
        string baseUrl,
        Dictionary<string, string> metadata,
        StripePlanDefinition plan,
        IReadOnlyList<StripeBookLineItem> books,
        decimal platformRetentionPercent,
        string connectedAccountId,
        StripeConnectRouting routing)
    {
        var lineItems = new List<SessionLineItemOptions>
        {
            new() { Price = plan.PriceId, Quantity = 1 },
        };

        foreach (var book in books)
        {
            lineItems.Add(new SessionLineItemOptions { Price = book.PriceId, Quantity = 1 });
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
            LineItems = lineItems,
            SubscriptionData = new SessionSubscriptionDataOptions
            {
                Description = plan.PlanName,
                Metadata = metadata,
            },
        };

        if (routing.UseConnectSplit)
        {
            sessionOptions.SubscriptionData.ApplicationFeePercent = platformRetentionPercent;
            sessionOptions.SubscriptionData.TransferData = new SessionSubscriptionDataTransferDataOptions
            {
                Destination = connectedAccountId,
            };
        }

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
        else
        {
            sessionOptions.AllowPromotionCodes = true;
        }

        return sessionOptions;
    }

    internal static SessionCreateOptions BuildOneTimePaymentSessionOptions(
        string email,
        string baseUrl,
        Dictionary<string, string> metadata,
        StripePlanDefinition plan,
        IReadOnlyList<StripeBookLineItem> books,
        long feeAmount,
        string connectedAccountId,
        StripeConnectRouting routing)
    {
        var paymentIntentData = new SessionPaymentIntentDataOptions
        {
            Metadata = metadata,
        };

        if (routing.UseConnectSplit)
        {
            paymentIntentData.ApplicationFeeAmount = feeAmount > 0 ? feeAmount : null;
            paymentIntentData.TransferData = new SessionPaymentIntentDataTransferDataOptions
            {
                Destination = connectedAccountId,
            };
        }

        var lineItems = new List<SessionLineItemOptions>
        {
            new() { Price = plan.PriceId, Quantity = 1 },
        };

        foreach (var book in books)
        {
            lineItems.Add(new SessionLineItemOptions { Price = book.PriceId, Quantity = 1 });
        }

        var sessionOptions = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = $"{baseUrl}/checkout/sucesso?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{baseUrl}/checkout/cancelado",
            CustomerEmail = email,
            ClientReferenceId = email,
            BillingAddressCollection = "required",
            Metadata = metadata,
            LineItems = lineItems,
            PaymentIntentData = paymentIntentData,
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
        else
        {
            sessionOptions.AllowPromotionCodes = true;
        }

        return sessionOptions;
    }

    private static void EnsureRequiredPaymentCoreMetadata(PaymentCoreCheckoutMetadata paymentCoreMetadata)
    {
        var missingFields = new List<string>();

        AddMissingField(missingFields, paymentCoreMetadata.AppId, StripeBillingService.AppIdMetadataKey);
        AddMissingField(missingFields, paymentCoreMetadata.AppName, StripeBillingService.AppNameMetadataKey);
        AddMissingField(missingFields, paymentCoreMetadata.TenantId, StripeBillingService.TenantIdMetadataKey);
        AddMissingField(missingFields, paymentCoreMetadata.SellerId, StripeBillingService.SellerIdMetadataKey);
        AddMissingField(missingFields, paymentCoreMetadata.SellerName, StripeBillingService.SellerNameMetadataKey);
        AddMissingField(missingFields, paymentCoreMetadata.OrderId, StripeBillingService.OrderIdMetadataKey);

        if (missingFields.Count > 0)
        {
            throw new InvalidOperationException(
                $"PaymentCore metadata obrigatoria ausente: {string.Join(", ", missingFields)}.");
        }
    }

    private static void AddMissingField(List<string> missingFields, string? value, string key)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            missingFields.Add(key);
        }
    }
}
