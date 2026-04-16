namespace CodigoJudaico.Api.Models;

public sealed class UserDiagnosis
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public string TrackId { get; set; } = string.Empty;
    public string TrackLabel { get; set; } = string.Empty;
    public string ScoresJson { get; set; } = "{}";
    public string Diagnostico { get; set; } = string.Empty;
    public string Gatilho { get; set; } = string.Empty;
    public string Sabedoria { get; set; } = string.Empty;
    public string Proverbio { get; set; } = string.Empty;
    public string Metodo { get; set; } = string.Empty;
    public DateTimeOffset AnsweredAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
