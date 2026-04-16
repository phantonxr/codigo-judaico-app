namespace CodigoJudaico.Api.Models;

public sealed class Offer
{
    public string Id { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string CtaLabel { get; set; } = string.Empty;
    public string CtaHref { get; set; } = string.Empty;
}
