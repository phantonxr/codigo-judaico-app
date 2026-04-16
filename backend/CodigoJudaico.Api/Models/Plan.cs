namespace CodigoJudaico.Api.Models;

public sealed class Plan
{
    public string Id { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public bool Highlighted { get; set; }
    public string FeaturesJson { get; set; } = "[]";
}
