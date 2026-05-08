using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed record MetaConversionEvent(
    string EventName,
    string EventId,
    string? Email,
    string? Name,
    string PlanId,
    string PlanName,
    long AmountInCents,
    DateTimeOffset EventTime,
    string? FbClickId = null,
    bool IncludePii = true);

public sealed class MetaConversionsService(
    IHttpClientFactory httpClientFactory,
    IOptions<MetaOptions> options,
    ILogger<MetaConversionsService> logger)
{
    private readonly MetaOptions _options = options.Value;

    public Task TrackLeadAsync(MetaConversionEvent evt, CancellationToken cancellationToken)
        => SendAsync(evt, cancellationToken);

    public Task TrackInitiateCheckoutAsync(MetaConversionEvent evt, CancellationToken cancellationToken)
        => SendAsync(evt, cancellationToken);

    public Task TrackPurchaseAsync(MetaConversionEvent evt, CancellationToken cancellationToken)
        => SendAsync(evt, cancellationToken);

    private async Task SendAsync(MetaConversionEvent evt, CancellationToken cancellationToken)
    {
        if (!_options.Enabled
            || string.IsNullOrWhiteSpace(_options.PixelId)
            || string.IsNullOrWhiteSpace(_options.AccessToken))
        {
            return;
        }

        var (firstName, lastName) = SplitName(evt.Name);

        var userData = evt.IncludePii
            ? BuildUserData(evt.Email, firstName, lastName, evt.FbClickId)
            : BuildAnonymousUserData(evt.FbClickId);

        var eventPayload = new
        {
            event_name = evt.EventName,
            event_time = evt.EventTime.ToUnixTimeSeconds(),
            event_id = evt.EventId,
            action_source = "website",
            user_data = userData,
            custom_data = new
            {
                currency = "BRL",
                value = evt.AmountInCents / 100.0m,
                content_name = evt.PlanName,
                content_ids = new[] { evt.PlanId },
                content_type = "product",
            },
        };

        var body = new
        {
            data = new[] { eventPayload },
            access_token = _options.AccessToken,
            test_event_code = string.IsNullOrWhiteSpace(_options.TestEventCode)
                ? null
                : _options.TestEventCode,
        };

        try
        {
            var client = httpClientFactory.CreateClient("MetaConversions");
            var response = await client.PostAsJsonAsync($"v19.0/{_options.PixelId}/events", body, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Meta Conversions API retornou {StatusCode} para o evento {EventName} {EventId}. Resposta: {Body}",
                    (int)response.StatusCode,
                    evt.EventName,
                    evt.EventId,
                    responseBody);
            }
            else
            {
                logger.LogInformation(
                    "Meta Conversions API: evento {EventName} enviado. EventId: {EventId}.",
                    evt.EventName,
                    evt.EventId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Falha ao enviar evento {EventName} para Meta Conversions API. EventId: {EventId}.",
                evt.EventName,
                evt.EventId);
        }
    }

    private static Dictionary<string, object> BuildUserData(
        string? email,
        string firstName,
        string lastName,
        string? fbClickId)
    {
        var userData = new Dictionary<string, object>();

        if (!string.IsNullOrWhiteSpace(email))
            userData["em"] = new[] { HashString(email.ToLowerInvariant()) };

        if (!string.IsNullOrWhiteSpace(firstName))
            userData["fn"] = new[] { HashString(firstName.ToLowerInvariant()) };

        if (!string.IsNullOrWhiteSpace(lastName))
            userData["ln"] = new[] { HashString(lastName.ToLowerInvariant()) };

        if (!string.IsNullOrWhiteSpace(fbClickId))
            userData["fbc"] = fbClickId;

        return userData;
    }

    private static Dictionary<string, object> BuildAnonymousUserData(string? fbClickId)
    {
        var userData = new Dictionary<string, object>();

        if (!string.IsNullOrWhiteSpace(fbClickId))
            userData["fbc"] = fbClickId;

        return userData;
    }

    private static string HashString(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static (string firstName, string lastName) SplitName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            return (string.Empty, string.Empty);

        var parts = fullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);

        return parts.Length switch
        {
            0 => (string.Empty, string.Empty),
            1 => (parts[0], string.Empty),
            _ => (parts[0], parts[1]),
        };
    }
}
