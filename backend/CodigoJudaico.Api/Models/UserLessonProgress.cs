namespace CodigoJudaico.Api.Models;

public sealed class UserLessonProgress
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public string LessonId { get; set; } = string.Empty;
    public bool Completed { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
