namespace CodigoJudaico.Api.Services;

public sealed class OpenAIOptions
{
    public const string SectionName = "OpenAI";

    /// <summary>API key from OpenAI (server-side only).</summary>
    public string? ApiKey { get; init; }

    /// <summary>Chat model, e.g. gpt-4o-mini.</summary>
    public string Model { get; init; } = "gpt-4o-mini";

    /// <summary>Base URL, default https://api.openai.com/</summary>
    public string BaseUrl { get; init; } = "https://api.openai.com/";
}
