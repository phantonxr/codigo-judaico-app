using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CodigoJudaico.Api.Contracts;

namespace CodigoJudaico.Api.Services;

public sealed class MentorOpenAiClient
{
    private readonly HttpClient _http;
    private readonly OpenAIOptions _options;
    private readonly ILogger<MentorOpenAiClient> _logger;

    public MentorOpenAiClient(
        HttpClient http,
        Microsoft.Extensions.Options.IOptions<OpenAIOptions> options,
        ILogger<MentorOpenAiClient> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.ApiKey);

    /// <summary>Mentor chat: system prompt + recent history (OpenAI chat format).</summary>
    public async Task<string?> CompleteMentorChatAsync(
        MentorChatRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return null;

        var system = string.IsNullOrWhiteSpace(request.SystemPrompt)
            ? DefaultMentorSystem
            : request.SystemPrompt.Trim();

        var messages = new List<object> { new { role = "system", content = system } };

        var historyAdded = TryAppendHistory(messages, request);

        if (!historyAdded)
        {
            var userText = (request.Message ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(userText))
                return null;
            messages.Add(new { role = "user", content = userText });
        }

        return await PostChatCompletionsAsync(messages, cancellationToken);
    }

    /// <summary>Daily checklist feedback: single user payload with JSON instructions.</summary>
    public async Task<string?> CompleteDailyFeedbackAsync(
        string instructionsAndContext,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return null;

        var text = (instructionsAndContext ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(text))
            return null;

        var messages = new List<object>
        {
            new
            {
                role = "system",
                content =
                    "Voce e o Rabino Mentor do app Codigo Judaico da Prosperidade. "
                    + "Siga exatamente o formato pedido no texto do usuario. "
                    + "Responda apenas com JSON valido (sem markdown, sem bloco de codigo).",
            },
            new { role = "user", content = text },
        };

        return await PostChatCompletionsAsync(messages, cancellationToken);
    }

    private bool TryAppendHistory(List<object> messages, MentorChatRequest request)
    {
        if (request.RecentHistory is not { ValueKind: JsonValueKind.Array } history)
            return false;

        var count = 0;
        foreach (var el in history.EnumerateArray())
        {
            if (count >= 24)
                break;

            if (el.ValueKind != JsonValueKind.Object)
                continue;

            if (!el.TryGetProperty("role", out var roleEl) ||
                !el.TryGetProperty("content", out var contentEl))
                continue;

            var role = roleEl.GetString();
            var content = contentEl.GetString();
            if (string.IsNullOrWhiteSpace(role) || content is null)
                continue;

            if (role is not ("user" or "assistant"))
                continue;

            messages.Add(new { role, content = content.Trim() });
            count++;
        }

        return count > 0;
    }

    private async Task<string?> PostChatCompletionsAsync(
        IReadOnlyList<object> messages,
        CancellationToken cancellationToken)
    {
        var model = string.IsNullOrWhiteSpace(_options.Model) ? "gpt-4o-mini" : _options.Model.Trim();

        var body = new
        {
            model,
            messages,
            max_tokens = 1400,
            temperature = 0.65,
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "v1/chat/completions");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey!.Trim());
        req.Content = JsonContent.Create(body);

        using var res = await _http.SendAsync(req, cancellationToken);
        var raw = await res.Content.ReadAsStringAsync(cancellationToken);

        if (!res.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "OpenAI chat completions failed: {Status} {Body}",
                (int)res.StatusCode,
                raw.Length > 500 ? raw[..500] : raw);
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var choice = root.GetProperty("choices")[0];
            var content = choice.GetProperty("message").GetProperty("content").GetString();
            return string.IsNullOrWhiteSpace(content) ? null : content.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse OpenAI response JSON");
            return null;
        }
    }

    private const string DefaultMentorSystem =
        "Voce e o Rabino Mentor do app Codigo Judaico da Prosperidade. "
        + "Ajude com sabedoria judaica, etica, autocontrole e construcao de patrimonio. "
        + "Seja humano e pratico. Termine com uma micro-acao. "
        + "Nao repita saudacoes em toda resposta.";

    /// <summary>Parses JSON returned by the model for daily feedback (both 21-day and macro formats).</summary>
    public static DailyFeedbackResponse? TryParseDailyFeedback(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var cleaned = text.Trim();
        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = cleaned.IndexOf('\n');
            var close = cleaned.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNl >= 0 && close > firstNl)
                cleaned = cleaned.Substring(firstNl + 1, close - firstNl - 1).Trim();
        }

        try
        {
            var dto = JsonSerializer.Deserialize<DailyFeedbackAiDto>(
                cleaned,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (dto is null)
                return null;

            var hasAny =
                !string.IsNullOrWhiteSpace(dto.Summary) ||
                !string.IsNullOrWhiteSpace(dto.MacroLesson) ||
                !string.IsNullOrWhiteSpace(dto.JewishWisdom);

            if (!hasAny)
                return null;

            var next = dto.NextFocus ?? dto.TomorrowFocus ?? string.Empty;
            var tomorrow = dto.TomorrowFocus ?? dto.NextFocus ?? string.Empty;

            return new DailyFeedbackResponse(
                Summary: dto.Summary ?? string.Empty,
                Correction: dto.Correction ?? string.Empty,
                MacroLesson: dto.MacroLesson ?? string.Empty,
                Blindspot: dto.Blindspot ?? string.Empty,
                JewishWisdom: dto.JewishWisdom ?? string.Empty,
                Proverb: dto.Proverb ?? string.Empty,
                NextFocus: next,
                ExtraTask: string.IsNullOrWhiteSpace(dto.ExtraTask) ? null : dto.ExtraTask,
                TomorrowFocus: tomorrow);
        }
        catch
        {
            return null;
        }
    }

    private sealed class DailyFeedbackAiDto
    {
        public string? Summary { get; set; }
        public string? Correction { get; set; }
        public string? MacroLesson { get; set; }
        public string? Blindspot { get; set; }
        public string? JewishWisdom { get; set; }
        public string? Proverb { get; set; }
        public string? NextFocus { get; set; }
        public string? TomorrowFocus { get; set; }
        public string? ExtraTask { get; set; }
    }
}
