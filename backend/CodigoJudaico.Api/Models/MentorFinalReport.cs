namespace CodigoJudaico.Api.Models;

public sealed class MentorFinalReport
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string ReportText { get; set; } = string.Empty;
    public string TopTriggersJson { get; set; } = "[]";
    public string EmotionalPattern { get; set; } = string.Empty;
    public string FinancialRiskPattern { get; set; } = string.Empty;
    public string NextStepRecommendation { get; set; } = string.Empty;
    public bool OfferShown { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public AppUser? User { get; set; }
}
