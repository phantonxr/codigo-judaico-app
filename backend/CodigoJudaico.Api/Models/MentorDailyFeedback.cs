namespace CodigoJudaico.Api.Models;

public sealed class MentorDailyFeedback
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Phase { get; set; } = string.Empty;
    public int DayNumber { get; set; }
    public string DetectedTrigger { get; set; } = string.Empty;
    public string EmotionalPattern { get; set; } = string.Empty;
    public string FinancialRisk { get; set; } = string.Empty;
    public string JewishWisdom { get; set; } = string.Empty;
    public string PracticalAction { get; set; } = string.Empty;
    public string FeedbackText { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public AppUser? User { get; set; }
}
