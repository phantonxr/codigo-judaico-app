using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed record UtmfyConversionRequest(
    string OrderId,
    string Email,
    string? Name,
    string PlanId,
    string PlanName,
    long AmountInCents,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ApprovedAt,
    string? UtmSource,
    string? UtmMedium,
    string? UtmCampaign,
    string? UtmTerm,
    string? UtmContent);

public sealed class UtmfyService(
    IHttpClientFactory httpClientFactory,
    IOptions<UtmfyOptions> options,
    ILogger<UtmfyService> logger)
{
    private readonly UtmfyOptions _options = options.Value;

    public async Task TrackAsync(UtmfyConversionRequest request, CancellationToken cancellationToken)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return;
        }

        var body = new
        {
            orderId = request.OrderId,
            platform = "other",
            paymentMethod = "credit_card",
            status = request.Status,
            createdAt = request.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
            approvedDate = request.ApprovedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
            customer = new
            {
                name = string.IsNullOrWhiteSpace(request.Name) ? request.Email : request.Name,
                email = request.Email,
                phone = (string?)null,
                document = (string?)null,
            },
            products = new[]
            {
                new
                {
                    id = request.PlanId,
                    name = request.PlanName,
                    planId = request.PlanId,
                    planName = request.PlanName,
                    quantity = 1,
                    priceInCents = request.AmountInCents,
                },
            },
            trackingParameters = new
            {
                utm_source = request.UtmSource,
                utm_medium = request.UtmMedium,
                utm_campaign = request.UtmCampaign,
                utm_term = request.UtmTerm,
                utm_content = request.UtmContent,
            },
            commission = new
            {
                totalPriceInCents = request.AmountInCents,
                gatewayFeeInCents = 0,
                userCommissionInCents = request.AmountInCents,
            },
        };

        try
        {
            var client = httpClientFactory.CreateClient("Utmfy");

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api-credentials/orders");
            httpRequest.Headers.Add("x-auth-token", _options.ApiKey);
            httpRequest.Content = JsonContent.Create(body);

            var response = await client.SendAsync(httpRequest, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "UTMfy retornou {StatusCode} para o pedido {OrderId}. Status: {Status}. Resposta: {Body}",
                    (int)response.StatusCode,
                    request.OrderId,
                    request.Status,
                    responseBody);
            }
            else
            {
                logger.LogInformation(
                    "UTMfy: evento '{Status}' enviado para o pedido {OrderId}.",
                    request.Status,
                    request.OrderId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Falha ao enviar evento '{Status}' para UTMfy. Pedido: {OrderId}.",
                request.Status,
                request.OrderId);
        }
    }
}
