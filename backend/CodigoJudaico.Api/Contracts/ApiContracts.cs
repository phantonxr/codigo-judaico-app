using System.Text.Json;

namespace CodigoJudaico.Api.Contracts;

public sealed record UserDto(
    Guid Id,
    string Email,
    string Name,
    string Plan,
    string PlanStatus,
    string? NextChargeDate);

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
