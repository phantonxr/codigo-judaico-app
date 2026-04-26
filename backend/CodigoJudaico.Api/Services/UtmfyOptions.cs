namespace CodigoJudaico.Api.Services;

public sealed class UtmfyOptions
{
    public const string SectionName = "Utmfy";

    public string ApiKey { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}
