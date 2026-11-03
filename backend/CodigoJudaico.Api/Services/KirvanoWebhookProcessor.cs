using System.Globalization;
using CodigoJudaico.Api.Contracts;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

/// <summary>Validates Kirvano webhooks and translates them for <see cref="ExternalSaleProcessor"/>.</summary>
public sealed class KirvanoWebhookProcessor(ExternalSaleProcessor sales, IOptions<KirvanoOptions> options)
{
    private readonly KirvanoOptions _options = options.Value;

    public Task<string> ProcessAsync(KirvanoWebhookPayload payload, CancellationToken ct)
    {
        var eventName = ApiMappers.Clean(payload.Event);
        ExternalSaleEventKind? kind = eventName switch
        {
            "SALE_APPROVED" => ExternalSaleEventKind.Approval,
            "SUBSCRIPTION_RENEWED" => ExternalSaleEventKind.Renewal,
            "SALE_REFUNDED" => ExternalSaleEventKind.Refund,
            "SALE_CHARGEBACK" => ExternalSaleEventKind.Chargeback,
            "SUBSCRIPTION_CANCELED" => ExternalSaleEventKind.Cancellation,
            "SUBSCRIPTION_EXPIRED" => ExternalSaleEventKind.Expiration,
            _ => null
        };
        if (kind is null) return Task.FromResult("ignored");
        var isApproval = kind is ExternalSaleEventKind.Approval or ExternalSaleEventKind.Renewal;

        var saleId = ApiMappers.Clean(payload.SaleId);
        if (saleId.Length is 0 or > 120) throw new ArgumentException("sale_id invalido.");
        if (ApiMappers.Clean(payload.CheckoutId).Length > 120) throw new ArgumentException("checkout_id invalido.");
        var eventAt = ParseTimestamp(payload.CreatedAt);
        if (isApproval && payload.Status != "APPROVED") throw new ArgumentException("Compra sem status APPROVED.");
        if (eventName == "SALE_REFUNDED" && payload.Status != "REFUNDED"
            || eventName == "SALE_CHARGEBACK" && payload.Status != "CHARGEBACK")
            throw new ArgumentException("Status inconsistente com o evento.");

        var bindings = (payload.Products ?? [])
            .Where(x => x is not null)
            .SelectMany(product => _options.Offers.Where(binding =>
                binding.ProductId == product.Id && binding.OfferId == product.OfferId))
            .Distinct().ToList();

        return sales.ProcessAsync(new ExternalSaleEvent
        {
            Provider = "Kirvano",
            SaleId = saleId,
            CheckoutId = payload.CheckoutId,
            Kind = kind.Value,
            EventAt = eventAt,
            CustomerEmail = payload.Customer?.Email ?? string.Empty,
            CustomerName = payload.Customer?.Name ?? string.Empty,
            Grants = bindings.Select(x => new ExternalOfferGrant(x.AccessPlan, x.BookIds)).ToList(),
            IsOneTimePayment = payload.Type == "ONE_TIME",
            IsMonthlySubscription = payload.Type == "RECURRING" && payload.Plan?.ChargeFrequency == "MONTHLY",
            PaidUntil = () => ParseTimestamp(payload.Plan?.NextChargeDate),
            FrontendBaseUrl = _options.FrontendBaseUrl,
        }, ct);
    }

    private DateTimeOffset ParseTimestamp(string? value)
    {
        if (DateTime.TryParseExact(value, "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var local))
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(_options.EventTimeZoneId);
            return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), zone));
        }
        // Require an explicit offset for ISO timestamps; never interpret them using the server timezone.
        if (value is not null && (value.EndsWith('Z') || value.LastIndexOf('+') > 9 || value.LastIndexOf('-') > 9)
            && DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var offset))
            return offset.ToUniversalTime();
        throw new ArgumentException("Data ausente ou invalida no webhook.");
    }
}
