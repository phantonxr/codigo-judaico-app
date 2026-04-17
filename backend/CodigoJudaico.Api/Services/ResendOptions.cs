namespace CodigoJudaico.Api.Services;

public sealed class ResendOptions
{
    public const string SectionName = "Resend";

    public bool Enabled { get; set; } = true;
    public string ApiKey { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string InboundWebhookSecret { get; set; } = string.Empty;
    public bool InboundWebhookDisableVerification { get; set; }
}
