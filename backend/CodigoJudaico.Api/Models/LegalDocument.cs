namespace CodigoJudaico.Api.Models;

public sealed class LegalDocument
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public AppUser? CreatedByUser { get; set; }
}
