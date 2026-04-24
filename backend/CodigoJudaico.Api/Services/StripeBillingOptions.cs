namespace CodigoJudaico.Api.Services;

public sealed class StripeBillingOptions
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string ConnectedAccountId { get; set; } = string.Empty;
    public decimal PlatformRetentionPercent { get; set; } = 10m;
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public string ApplicationKey { get; set; } = "codigo-judaico";
    public string PaymentCoreAppName { get; set; } = "Codigo Judaico";
    public string PaymentCoreTenantId { get; set; } = string.Empty;
    public string PaymentCoreSellerId { get; set; } = string.Empty;
    public string PaymentCoreSellerName { get; set; } = string.Empty;
    public string[] ConnectSplitSupportedCountries { get; set; } = ["ca"];
    public string RequiredCurrency { get; set; } = "brl";
    public StripeCheckoutPlanOptions FirstAccess { get; set; } = new();
    public StripeCheckoutPlanOptions Renewal { get; set; } = new();
    public StripeCheckoutPlanOptions Monthly { get; set; } = new();
    public StripeCheckoutPlanOptions Annual { get; set; } = new();
    public StripeCheckoutPlanOptions Lifetime { get; set; } = new();
}

public sealed class StripeCheckoutPlanOptions
{
    public string PriceId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string PromotionCouponId { get; set; } = string.Empty;
}
