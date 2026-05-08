namespace CodigoJudaico.Api.Services;

public sealed class MetaOptions
{
    public const string SectionName = "Meta";

    public string PixelId { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    // Preencha apenas em ambiente de testes no Events Manager do Meta
    public string TestEventCode { get; set; } = string.Empty;
}
