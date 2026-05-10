namespace CodigoJudaico.Api.Services;

public sealed class CheckoutRecoveryOptions
{
    public const string SectionName = "CheckoutRecovery";

    public bool Enabled { get; set; } = true;
    public bool BackfillExistingPending { get; set; }
    public int ScanIntervalMinutes { get; set; } = 10;
    public int BatchSize { get; set; } = 25;
    public int PersuasiveDelayHours { get; set; } = 24;
    public int DiscountDelayHours { get; set; } = 48;
    public int TokenExpiresDays { get; set; } = 14;
    public int DiscountExpiresHours { get; set; } = 48;
    public string ApiBaseUrl { get; set; } = string.Empty;
    public string PublicPostalAddress { get; set; } = string.Empty;
    public string CompanyName { get; set; } = "Codigo Judaico da Prosperidade";
    public string ReplyToPattern { get; set; } = string.Empty;
    public string DiscountCouponId { get; set; } = string.Empty;
    public string DiscountPromotionCodeId { get; set; } = string.Empty;
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountLabel { get; set; } = "condicao especial";
}
