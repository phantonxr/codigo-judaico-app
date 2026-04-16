namespace CodigoJudaico.Api.Models;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = "Aluno";
    public string PlanName { get; set; } = string.Empty;
    public string PlanStatus { get; set; } = string.Empty;
    public DateOnly? NextChargeDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserDiagnosis? Diagnosis { get; set; }
    public UserJourneyState? JourneyState { get; set; }
    public List<UserLessonProgress> LessonProgressEntries { get; set; } = [];
    public List<MentorChatMessage> MentorMessages { get; set; } = [];
}
