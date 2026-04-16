namespace CodigoJudaico.Api.Models;

public sealed class UserJourneyState
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public string AssignedTrack { get; set; } = string.Empty;
    public DateOnly? JourneyStartDate { get; set; }
    public string ProgressJson { get; set; } = "{}";
    public string CalendarJson { get; set; } = "{\"completedDays\":{}}";
    public DateTimeOffset UpdatedAt { get; set; }
}
