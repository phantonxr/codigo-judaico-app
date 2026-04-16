namespace CodigoJudaico.Api.Models;

public sealed class WisdomSnippet
{
    public string Id { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Teaching { get; set; } = string.Empty;
}
