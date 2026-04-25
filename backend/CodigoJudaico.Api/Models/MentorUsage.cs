namespace CodigoJudaico.Api.Models;

public sealed class MentorUsage
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public int InteractionsCount { get; set; }
    public string PlanType { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public AppUser? User { get; set; }
}
