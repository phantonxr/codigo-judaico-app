using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using System.Text.Json;

namespace CodigoJudaico.Api.Contracts;

public static class ApiMappers
{
    public static UserDto ToDto(this AppUser user) =>
        new(
            user.Id,
            user.Email,
            user.Name,
            user.PlanName,
            user.PlanStatus,
            user.NextChargeDate?.ToString("yyyy-MM-dd"),
            AppAccessEvaluator.HasPremiumAccess(user),
            user.IsMasterUser,
            user.HasCompletedAssessment || user.Diagnosis is not null);

    public static DiagnosisDto? ToDto(this UserDiagnosis? diagnosis)
    {
        if (diagnosis is null)
        {
            return null;
        }

        return new DiagnosisDto(
            diagnosis.TrackId,
            diagnosis.TrackLabel,
            ParseJson(diagnosis.ScoresJson),
            diagnosis.Diagnostico,
            diagnosis.Gatilho,
            diagnosis.Sabedoria,
            diagnosis.Proverbio,
            diagnosis.Metodo,
            diagnosis.AnsweredAt.ToString("O"));
    }

    public static JourneyStateDto ToDto(this UserJourneyState? state)
    {
        return new JourneyStateDto(
            string.IsNullOrWhiteSpace(state?.AssignedTrack) ? null : state.AssignedTrack,
            state?.JourneyStartDate?.ToString("yyyy-MM-dd"),
            ParseJson(state?.ProgressJson, "{}"),
            ParseJson(state?.CalendarJson, "{\"completedDays\":{}}"));
    }

    public static LessonProgressDto ToDto(this UserLessonProgress progress) =>
        new(progress.LessonId, progress.Completed, progress.UpdatedAt.ToString("O"));

    public static MentorMessageDto ToDto(this MentorChatMessage message) =>
        new(message.Id, message.Role, message.Content, message.CreatedAt.ToString("O"));

    public static LessonDto ToDto(this Lesson lesson) =>
        new(
            lesson.Id,
            lesson.Title,
            lesson.Category,
            lesson.Duration,
            lesson.Teaching,
            lesson.Proverb,
            lesson.Practical,
            lesson.Reflection,
            lesson.VideoUrl,
            lesson.Summary);

    public static PlanDto ToDto(this Plan plan) =>
        new(
            plan.Id,
            plan.Name,
            plan.Price,
            plan.Period,
            plan.Highlighted,
            DeserializeStringList(plan.FeaturesJson));

    public static OfferDto ToDto(this Offer offer) =>
        new(offer.Id, offer.Title, offer.Description, offer.Price, offer.CtaLabel, offer.CtaHref);

    public static WisdomDto ToDto(this WisdomSnippet wisdom) =>
        new(wisdom.Id, wisdom.Source, wisdom.Teaching);

    public static SessionBootstrapResponse ToBootstrap(
        this AppUser user,
        IReadOnlyList<UserLessonProgress> lessonProgress,
        IReadOnlyList<MentorChatMessage> mentorMessages) =>
        new(
            user.ToDto(),
            user.Diagnosis.ToDto(),
            user.JourneyState.ToDto(),
            lessonProgress.Select(x => x.ToDto()).ToList(),
            mentorMessages.Select(x => x.ToDto()).ToList());

    public static string NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? string.Empty : email.Trim().ToLowerInvariant();

    public static string Clean(string? value) => (value ?? string.Empty).Trim();

    public static string Serialize(JsonElement? value, string fallbackJson)
    {
        if (value is not { } element || element.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return fallbackJson;
        }

        return element.GetRawText();
    }

    public static DateOnly? ParseDateOnly(string? value)
    {
        return DateOnly.TryParse(value, out var parsed) ? parsed : null;
    }

    public static DateTimeOffset? ParseDateTimeOffset(string? value)
    {
        return DateTimeOffset.TryParse(value, out var parsed) ? parsed : null;
    }

    private static JsonElement ParseJson(string? json, string fallbackJson = "{}")
    {
        using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? fallbackJson : json);
        return document.RootElement.Clone();
    }

    private static IReadOnlyList<string> DeserializeStringList(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
