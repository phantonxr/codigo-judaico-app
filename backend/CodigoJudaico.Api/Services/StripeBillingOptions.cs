namespace CodigoJudaico.Api.Services;

public sealed class StripeBillingOptions
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string ConnectedAccountId { get; set; } = string.Empty;
    public decimal PlatformRetentionPercent { get; set; } = 2m;
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public StripeCheckoutPlanOptions Monthly { get; set; } = new();
    public StripeCheckoutPlanOptions Annual { get; set; } = new();
}

public sealed class StripeCheckoutPlanOptions
{
    public string PriceId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string PromotionCouponId { get; set; } = string.Empty;
}
