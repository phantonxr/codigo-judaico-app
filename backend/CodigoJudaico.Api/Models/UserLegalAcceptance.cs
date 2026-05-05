namespace CodigoJudaico.Api.Models;

public sealed class UserLegalAcceptance
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TermsVersion { get; set; } = string.Empty;
    public string PrivacyVersion { get; set; } = string.Empty;
    public string DisclaimerVersion { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public DateTimeOffset AcceptedAt { get; set; }
    public AppUser? User { get; set; }
}
