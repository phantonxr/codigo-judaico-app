namespace CodigoJudaico.Api.Models;

public sealed class Lesson
{
    public string Id { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Teaching { get; set; } = string.Empty;
    public string Proverb { get; set; } = string.Empty;
    public string Practical { get; set; } = string.Empty;
    public string Reflection { get; set; } = string.Empty;
    public string VideoUrl { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
}
