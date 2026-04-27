using System.Text.Json;

namespace CodigoJudaico.Api.Contracts;

public sealed record UserDto(
    Guid Id,
    string Email,
    string Name,
    string Plan,
    string PlanStatus,
    string? NextChargeDate,
    bool HasActiveAccess,
    bool IsMasterUser,
    bool HasCompletedAssessment);

public sealed record AdminSubscriberDto(
    Guid Id,
    string Email,
    string Name,
    string Plan,
    string PlanStatus,
    string? NextChargeDate,
    bool HasActiveAccess,
    bool AccessEnabled,
    int? DaysUntilExpiration,
    string? AccessGrantedAt,
    string CreatedAt,
    string UpdatedAt,
    string StripeCustomerId,
    string StripeSubscriptionId,
    string LastStripeCheckoutSessionId,
    bool HasUsedRenewalOffer);

public sealed record AdminSubscribersResponse(
    int TotalSubscribers,
    int ActiveSubscribers,
    int ExpiredSubscribers,
    int PendingSubscribers,
    IReadOnlyList<AdminSubscriberDto> Subscribers);

public sealed record DiagnosisDto(
    string TrackId,
    string TrackLabel,
    JsonElement Scores,
    string Diagnostico,
    string Gatilho,
    string Sabedoria,
    string Proverbio,
    string Metodo,
    string? AnsweredAt);

public sealed record JourneyStateDto(
    string? AssignedTrack,
    string? JourneyStartDate,
    JsonElement Progress,
    JsonElement Calendar);

public sealed record LessonProgressDto(
    string LessonId,
    bool Completed,
    string UpdatedAt);

public sealed record MentorMessageDto(
    long Id,
    string Role,
    string Content,
    string Timestamp);

public sealed record SessionBootstrapResponse(
    UserDto User,
    DiagnosisDto? Diagnosis,
    JourneyStateDto Journey,
    IReadOnlyList<LessonProgressDto> LessonProgress,
    IReadOnlyList<MentorMessageDto> MentorMessages);

public sealed record AuthenticatedSessionResponse(
    string Token,
    SessionBootstrapResponse Session);

public sealed record LessonDto(
    string Id,
    string Title,
    string Category,
    string Duration,
    string Teaching,
    string Proverb,
    string Practical,
    string Reflection,
    string VideoUrl,
    string Summary);

public sealed record PlanDto(
    string Id,
    string Name,
    string Price,
    string Period,
    bool Highlighted,
    IReadOnlyList<string> Features);

public sealed record OfferDto(
    string Id,
    string Title,
    string Description,
    string Price,
    string CtaLabel,
    string CtaHref);

public sealed record WisdomDto(
    string Id,
    string Source,
    string Teaching);

public sealed record MentorChatResponse(string Reply);

public sealed record MentorUsageResponse(
    int InteractionsToday,
    int DailyLimit,
    bool CanSendMessage,
    string PlanType);

public sealed record MentorChatBlockedResponse(
    string Code,
    string Message,
    int InteractionsToday,
    int DailyLimit,
    string PlanType,
    string CtaLabel,
    string UpsellName,
    string UpsellPrice);

public sealed record MentorDailyFeedbackGenerateRequest
{
    public string? UserId { get; init; }
    public string? Phase { get; init; }
    public int DayNumber { get; init; }
    public IReadOnlyList<string> CompletedTasks { get; init; } = [];
    public IReadOnlyList<string> PartialTasks { get; init; } = [];
    public IReadOnlyList<string> NotCompletedTasks { get; init; } = [];
    public string? ReflectionText { get; init; }
    public string? EmotionText { get; init; }
    public string? TriggerText { get; init; }
    public string? CurrentTrack { get; init; }
}

public sealed record MentorDailyFeedbackGenerateResponse(
    string DetectedTrigger,
    string EmotionalPattern,
    string FinancialRisk,
    string JewishWisdom,
    string PracticalAction,
    string FeedbackText,
    string DetectedEmotion,
    string TriggerType,
    string ObservedPattern);

public sealed record MentorFinalReportGenerateRequest
{
    public string? UserId { get; init; }
    public JsonElement? AllDaysProgress { get; init; }
    public JsonElement? DailyFeedbacks { get; init; }
    public JsonElement? Reflections { get; init; }
    public JsonElement? Triggers { get; init; }
    public JsonElement? Emotions { get; init; }
}

public sealed record MentorFinalReportGenerateResponse(
    string ReportText,
    IReadOnlyList<string> TopTriggers,
    string EmotionalPattern,
    string FinancialRiskPattern,
    string NextStepRecommendation,
    string OfferBlock);

public sealed record DailyFeedbackResponse(
    string Summary,
    string Correction,
    string MacroLesson,
    string Blindspot,
    string JewishWisdom,
    string Proverb,
    string NextFocus,
    string? ExtraTask,
    string TomorrowFocus);

public sealed record SessionRequest
{
    public string Email { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string? Plan { get; init; }
}

public sealed record LoginRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

public sealed record ForgotPasswordRequest
{
    public string Email { get; init; } = string.Empty;
}

public sealed record ResetPasswordRequest
{
    public string Token { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

public sealed record CheckoutSessionCreateRequest
{
    public string Email { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string PlanId { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string? UtmSource { get; init; }
    public string? UtmMedium { get; init; }
    public string? UtmCampaign { get; init; }
    public string? UtmTerm { get; init; }
    public string? UtmContent { get; init; }
    public IReadOnlyList<string> BookIds { get; init; } = [];
}

public sealed record BookCatalogDto(
    string Id,
    string Title,
    string Description,
    string PriceLabel,
    string CoverImageUrl,
    bool IsPurchasable);

public sealed record BookLibraryDto(
    string Id,
    string Title,
    string Description,
    string PriceLabel,
    string CoverImageUrl,
    bool IsPurchased,
    bool IsPurchasable);

public sealed record BookCheckoutRequest
{
    public IReadOnlyList<string> BookIds { get; init; } = [];
}

public sealed record CheckoutSessionCreateResponse(
    string SessionId,
    string Url,
    long AmountInCents = 0);

public sealed record LoginBlockedResponse(
    string Code,
    string Message,
    string? Email,
    string? PlanId,
    string? PlanName,
    string? PlanStatus);

public sealed record CheckoutSessionStatusResponse(
    string SessionId,
    string Status,
    string PaymentStatus,
    bool AccessGranted,
    string? Email,
    string? PlanId,
    string? PlanName);

public sealed record AvailablePlanDto(
    string Id,
    string Name,
    string Price,
    string Period,
    string Description,
    bool IsHighlighted);

public sealed record ProfileUpsertRequest
{
    public string? Name { get; init; }
    public string? Plan { get; init; }
    public string? PlanStatus { get; init; }
    public string? NextChargeDate { get; init; }
}

public sealed record DiagnosisUpsertRequest
{
    public string TrackId { get; init; } = string.Empty;
    public string TrackLabel { get; init; } = string.Empty;
    public JsonElement? Scores { get; init; }
    public string Diagnostico { get; init; } = string.Empty;
    public string Gatilho { get; init; } = string.Empty;
    public string Sabedoria { get; init; } = string.Empty;
    public string Proverbio { get; init; } = string.Empty;
    public string Metodo { get; init; } = string.Empty;
    public string? AnsweredAt { get; init; }
}

public sealed record JourneyStateUpsertRequest
{
    public string? AssignedTrack { get; init; }
    public string? JourneyStartDate { get; init; }
    public JsonElement? Progress { get; init; }
    public JsonElement? Calendar { get; init; }
}

public sealed record LessonProgressUpsertRequest
{
    public bool Completed { get; init; }
}

public sealed record MentorChatRequest
{
    public string? UserId { get; init; }
    public string? UserName { get; init; }
    public string? CurrentPlan { get; init; }
    public string? Message { get; init; }

    /// <summary>System prompt from the SPA (includes journey phase and diagnosis context).</summary>
    public string? SystemPrompt { get; init; }

    /// <summary>Recent chat turns: [{ "role": "user"|"assistant", "content": "..." }].</summary>
    public JsonElement? RecentHistory { get; init; }
}

public sealed record DailyFeedbackRequest
{
    public string? SystemPrompt { get; init; }
    public string? TrailType { get; init; }
    public int? CurrentDay { get; init; }
    public IReadOnlyList<string>? CompletedTasks { get; init; }
    public string? Reflection { get; init; }
    public string? HowFelt { get; init; }
    public string? EmotionalTrigger { get; init; }
}
