namespace CodigoJudaico.Api.Services;

public sealed class EvolutionApiOptions
{
    public const string SectionName = "EvolutionApi";

    public bool Enabled { get; set; } = false;
    public string BaseUrl { get; set; } = string.Empty;
    public string Instance { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string GroupId { get; set; } = string.Empty;
}
