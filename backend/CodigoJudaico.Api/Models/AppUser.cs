namespace CodigoJudaico.Api.Models;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = "Aluno";
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsMasterUser { get; set; }
    public bool AccessEnabled { get; set; }
    public DateTimeOffset? AccountCreatedEmailSentAt { get; set; }
    public DateTimeOffset? AccessGrantedAt { get; set; }
    public DateTimeOffset? AccessEmailSentAt { get; set; }
    public string PasswordResetTokenHash { get; set; } = string.Empty;
    public DateTimeOffset? PasswordResetTokenExpiresAt { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string PlanStatus { get; set; } = string.Empty;
    public DateOnly? NextChargeDate { get; set; }
    public string StripeCustomerId { get; set; } = string.Empty;
    public string StripeSubscriptionId { get; set; } = string.Empty;
    public string LastStripeCheckoutSessionId { get; set; } = string.Empty;
    public bool HasUsedRenewalOffer { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserDiagnosis? Diagnosis { get; set; }
    public UserJourneyState? JourneyState { get; set; }
    public List<UserLessonProgress> LessonProgressEntries { get; set; } = [];
    public List<MentorChatMessage> MentorMessages { get; set; } = [];
    public List<AppSession> Sessions { get; set; } = [];
}
