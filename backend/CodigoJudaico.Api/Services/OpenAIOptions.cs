namespace CodigoJudaico.Api.Services;

public sealed class OpenAIOptions
{
    public const string SectionName = "OpenAI";

    /// <summary>API key from OpenAI (server-side only).</summary>
    public string? ApiKey { get; init; }

    /// <summary>Chat model, e.g. gpt-4o-mini.</summary>
    public string Model { get; init; } = "gpt-4o-mini";

    /// <summary>
    /// API origin only, e.g. https://api.openai.com/ — do not include <c>/v1</c>
    /// (requests use path <c>v1/chat/completions</c>).
    /// </summary>
    public string BaseUrl { get; init; } = "https://api.openai.com/";

    /// <summary>
    /// Strips a trailing <c>/v1</c> so env vars like <c>https://api.openai.com/v1</c>
    /// do not produce <c>.../v1/v1/...</c> when combined with relative paths.
    /// </summary>
    public static string NormalizeBaseUrl(string? configured)
    {
        if (string.IsNullOrWhiteSpace(configured))
            return "https://api.openai.com/";

        var s = configured.Trim().TrimEnd('/');
        while (s.EndsWith("/v1", StringComparison.OrdinalIgnoreCase))
            s = s[..^3];

        return s + "/";
    }
}
