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

    /// <summary>Generates daily feedback for the 21-day journey using structured JSON output.</summary>
    public async Task<string?> CompleteMentorDailyFeedbackV2Async(
        string systemPrompt,
        string userPayload,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return null;

        var system = string.IsNullOrWhiteSpace(systemPrompt)
            ? DefaultMentorSystem
            : systemPrompt.Trim();

        var payload = (userPayload ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(payload))
            return null;

        var messages = new List<object>
        {
            new { role = "system", content = system },
            new
            {
                role = "system",
                content =
                    "Responda APENAS com JSON valido (sem markdown, sem bloco de codigo). "
                    + "Nao use diagnostico clinico. Use termos como 'possivel padrao', 'sinal comportamental', 'tendencia observada'.",
            },
            new { role = "user", content = payload },
        };

        return await PostChatCompletionsAsync(messages, cancellationToken);
    }

    /// <summary>Generates a 21-day final report using structured JSON output.</summary>
    public async Task<string?> CompleteMentorFinalReportAsync(
        string systemPrompt,
        string userPayload,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return null;

        var system = string.IsNullOrWhiteSpace(systemPrompt)
            ? DefaultMentorSystem
            : systemPrompt.Trim();

        var payload = (userPayload ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(payload))
            return null;

        var messages = new List<object>
        {
            new { role = "system", content = system },
            new
            {
                role = "system",
                content =
                    "Responda APENAS com JSON valido (sem markdown, sem bloco de codigo). "
                    + "Mantenha tom de rabino sabio, firme, humano e acolhedor. "
                    + "Nao prometa riqueza garantida.",
            },
            new { role = "user", content = payload },
        };

        return await PostChatCompletionsAsync(messages, cancellationToken);
    }

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
        "Voce e o Rabino Mentor IA do Codigo Judaico da Prosperidade. "
        + "Sua missao e ajudar o usuario a identificar gatilhos mentais, emocionais e comportamentais ligados ao dinheiro, "
        + "com sabedoria judaica, prudencia, dominio proprio, construcao patrimonial, legado e disciplina diaria. "
        + "Nao diagnostique clinicamente. Use linguagem como 'possivel padrao', 'sinal comportamental', 'tendencia observada'. "
        + "Nao prometa riqueza garantida. Prosperidade nasce de consciencia, dominio emocional, repeticao diaria e base solida. "
        + "Evite repetir sempre 'Shalom'. Seja firme, humano e acolhedor. "
        + "Sempre que fizer sentido, termine com uma micro-acao pratica.";

    public static MentorDailyFeedbackGenerateResponse? TryParseMentorDailyFeedbackV2(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var cleaned = CleanJsonFence(text);

        try
        {
            var dto = JsonSerializer.Deserialize<MentorDailyFeedbackV2Dto>(
                cleaned,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (dto is null)
                return null;

            var hasAny =
                !string.IsNullOrWhiteSpace(dto.DetectedTrigger)
                || !string.IsNullOrWhiteSpace(dto.FeedbackText)
                || !string.IsNullOrWhiteSpace(dto.PracticalAction);

            if (!hasAny)
                return null;

            return new MentorDailyFeedbackGenerateResponse(
                DetectedTrigger: dto.DetectedTrigger ?? string.Empty,
                EmotionalPattern: dto.EmotionalPattern ?? string.Empty,
                FinancialRisk: dto.FinancialRisk ?? string.Empty,
                JewishWisdom: dto.JewishWisdom ?? string.Empty,
                PracticalAction: dto.PracticalAction ?? string.Empty,
                FeedbackText: dto.FeedbackText ?? string.Empty,
                DetectedEmotion: dto.DetectedEmotion ?? string.Empty,
                TriggerType: dto.TriggerType ?? string.Empty,
                ObservedPattern: dto.ObservedPattern ?? string.Empty);
        }
        catch
        {
            return null;
        }
    }

    public static MentorFinalReportGenerateResponse? TryParseMentorFinalReport(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var cleaned = CleanJsonFence(text);

        try
        {
            var dto = JsonSerializer.Deserialize<MentorFinalReportDto>(
                cleaned,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (dto is null)
                return null;

            var hasAny = !string.IsNullOrWhiteSpace(dto.ReportText);
            if (!hasAny)
                return null;

            return new MentorFinalReportGenerateResponse(
                ReportText: dto.ReportText ?? string.Empty,
                TopTriggers: dto.TopTriggers ?? Array.Empty<string>(),
                EmotionalPattern: dto.EmotionalPattern ?? string.Empty,
                FinancialRiskPattern: dto.FinancialRiskPattern ?? string.Empty,
                NextStepRecommendation: dto.NextStepRecommendation ?? string.Empty,
                OfferBlock: dto.OfferBlock ?? string.Empty);
        }
        catch
        {
            return null;
        }
    }

    private static string CleanJsonFence(string text)
    {
        var cleaned = text.Trim();
        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = cleaned.IndexOf('\n');
            var close = cleaned.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNl >= 0 && close > firstNl)
                cleaned = cleaned.Substring(firstNl + 1, close - firstNl - 1).Trim();
        }

        return cleaned;
    }

    private sealed class MentorDailyFeedbackV2Dto
    {
        public string? DetectedTrigger { get; set; }
        public string? EmotionalPattern { get; set; }
        public string? FinancialRisk { get; set; }
        public string? JewishWisdom { get; set; }
        public string? PracticalAction { get; set; }
        public string? FeedbackText { get; set; }

        // Progressive profile signals
        public string? DetectedEmotion { get; set; }
        public string? TriggerType { get; set; }
        public string? ObservedPattern { get; set; }
    }

    private sealed class MentorFinalReportDto
    {
        public string? ReportText { get; set; }
        public string[]? TopTriggers { get; set; }
        public string? EmotionalPattern { get; set; }
        public string? FinancialRiskPattern { get; set; }
        public string? NextStepRecommendation { get; set; }
        public string? OfferBlock { get; set; }
    }

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
