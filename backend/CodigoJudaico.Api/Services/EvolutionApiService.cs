using System.Globalization;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed record EvolutionSaleNotification(
    string BuyerName,
    string BuyerEmail,
    string PlanName,
    long AmountInCents,
    bool IsFirstPurchase,
    bool HasBooks,
    IReadOnlyList<string> BookIds);

public sealed class EvolutionApiService(
    IHttpClientFactory httpClientFactory,
    IOptions<EvolutionApiOptions> options,
    ILogger<EvolutionApiService> logger)
{
    private readonly EvolutionApiOptions _options = options.Value;

    public async Task NotifySaleAsync(EvolutionSaleNotification notification, CancellationToken cancellationToken)
    {
        if (!_options.Enabled
            || string.IsNullOrWhiteSpace(_options.BaseUrl)
            || string.IsNullOrWhiteSpace(_options.Instance)
            || string.IsNullOrWhiteSpace(_options.GroupId))
        {
            return;
        }

        var amountFormatted = (notification.AmountInCents / 100m).ToString("C", new CultureInfo("pt-BR"));
        var hasPlan = !string.IsNullOrWhiteSpace(notification.PlanName);

        var saleType = !hasPlan && notification.HasBooks
            ? "Compra de livros"
            : notification.IsFirstPurchase
                ? "Primeira compra"
                : "Renovação / nova compra";

        var planDisplay = hasPlan ? notification.PlanName : "Livros";

        var lines = new System.Text.StringBuilder();
        lines.AppendLine("🎉 *Nova Venda!*");
        lines.AppendLine();
        // lines.AppendLine($"👤 *Comprador:* {notification.BuyerName} ({notification.BuyerEmail})");
        lines.AppendLine($"📦 *Plano:* {planDisplay}");
        lines.AppendLine($"💰 *Valor:* {amountFormatted}");
        lines.Append($"🏷️ *Tipo:* {saleType}");

        if (notification.HasBooks && notification.BookIds.Count > 0)
        {
            lines.AppendLine();
            lines.Append($"📚 *Livros:* {string.Join(", ", notification.BookIds)}");
        }

        var body = new
        {
            number = _options.GroupId,
            text = lines.ToString(),
        };

        try
        {
            var client = httpClientFactory.CreateClient("EvolutionApi");
            var url = $"message/sendText/{Uri.EscapeDataString(_options.Instance)}";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", _options.ApiKey);
            request.Content = JsonContent.Create(body);

            var response = await client.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "EvolutionApi retornou {StatusCode} ao notificar venda de {Email}. Resposta: {Body}",
                    (int)response.StatusCode,
                    notification.BuyerEmail,
                    responseBody);
            }
            else
            {
                logger.LogInformation(
                    "EvolutionApi: notificacao de venda enviada para o grupo. Comprador: {Email}, Plano: {Plan}.",
                    notification.BuyerEmail,
                    notification.PlanName);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Falha ao enviar notificacao de venda via EvolutionApi. Comprador: {Email}.",
                notification.BuyerEmail);
        }
    }
}
