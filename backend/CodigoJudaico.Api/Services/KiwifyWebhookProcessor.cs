using System.Globalization;
using CodigoJudaico.Api.Contracts;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

/// <summary>
/// Validates Kiwify sales webhooks and translates them for <see cref="ExternalSaleProcessor"/>.
/// A subscription is one sale (key <c>kiwify:sub:{subscription_id}</c>): each renewal brings a new
/// order_id, but the same subscription_id. One-time purchases use <c>kiwify:order:{order_id}</c>.
/// </summary>
public sealed class KiwifyWebhookProcessor(ExternalSaleProcessor sales, IOptions<KiwifyOptions> options)
{
    private static readonly string[] LocalDateFormats = ["yyyy-MM-dd HH:mm", "yyyy-MM-dd HH:mm:ss"];
    private readonly KiwifyOptions _options = options.Value;

    public Task<string> ProcessAsync(KiwifyWebhookPayload payload, CancellationToken ct)
    {
        var eventType = ApiMappers.Clean(payload.WebhookEventType);
        var status = ApiMappers.Clean(payload.OrderStatus);
        ExternalSaleEventKind? kind = eventType switch
        {
            "order_approved" => ExternalSaleEventKind.Approval,
            "subscription_renewed" => ExternalSaleEventKind.Renewal,
            "order_refunded" => ExternalSaleEventKind.Refund,
            "chargeback" => ExternalSaleEventKind.Chargeback,
            // Refunds and chargebacks of a subscription also send subscription_canceled with that order status.
            "subscription_canceled" => status switch
            {
                "refunded" => ExternalSaleEventKind.Refund,
                "chargedback" => ExternalSaleEventKind.Chargeback,
                _ => ExternalSaleEventKind.Cancellation
            },
            // pix_created, billet_created, order_rejected and subscription_late change nothing:
            // a refused renewal keeps the paid period, which simply runs out.
            _ => null
        };
        if (kind is null) return Task.FromResult("ignored");
        var isApproval = kind is ExternalSaleEventKind.Approval or ExternalSaleEventKind.Renewal;
        if (isApproval && status != "paid") throw new ArgumentException("Compra sem order_status paid.");
        if (eventType == "order_refunded" && status != "refunded"
            || eventType == "chargeback" && status != "chargedback")
            throw new ArgumentException("order_status inconsistente com o evento.");

        var orderId = ApiMappers.Clean(payload.OrderId);
        if (orderId.Length is 0 or > 100) throw new ArgumentException("order_id invalido.");
        var subscriptionId = ApiMappers.Clean(payload.SubscriptionId);
        if (subscriptionId.Length == 0) subscriptionId = ApiMappers.Clean(payload.Subscription?.Id);
        if (subscriptionId.Length > 100) throw new ArgumentException("subscription_id invalido.");
        var isSubscription = subscriptionId.Length > 0;

        var productId = ApiMappers.Clean(payload.Product?.ProductId);
        var planId = ApiMappers.Clean(payload.Subscription?.Plan?.Id);
        var bindings = _options.Products.Where(x => planId.Length > 0 && x.ProductId == productId && x.PlanId == planId).ToList();
        if (bindings.Count == 0) bindings = _options.Products.Where(x => x.ProductId == productId && x.PlanId.Length == 0).ToList();
        // Reversals without the product block are still applied: they can only affect a sale stored before.
        if (!isApproval && productId.Length > 0 && !_options.Products.Any(x => x.ProductId == productId))
            return Task.FromResult("ignored");

        var eventAt = isApproval
            ? ParseLocal(FirstFilled(payload.ApprovedDate, payload.UpdatedAt, payload.CreatedAt))
            : FirstFilled(kind == ExternalSaleEventKind.Refund ? payload.RefundedAt : null,
                payload.UpdatedAt, payload.ApprovedDate, payload.CreatedAt) is { } date
                ? ParseLocal(date)
                // Summarized cancellation payloads may lack dates; reversals are terminal regardless of time.
                : DateTimeOffset.UtcNow;

        var frequency = ApiMappers.Clean(payload.Subscription?.Plan?.Frequency);
        return sales.ProcessAsync(new ExternalSaleEvent
        {
            Provider = "Kiwify",
            SaleId = isSubscription ? "kiwify:sub:" + subscriptionId : "kiwify:order:" + orderId,
            CheckoutId = orderId,
            Kind = kind.Value,
            EventAt = eventAt,
            CustomerEmail = payload.Customer?.Email ?? string.Empty,
            CustomerName = FirstFilled(payload.Customer?.FullName, payload.Customer?.FirstName) ?? string.Empty,
            Grants = bindings.Select(x => new ExternalOfferGrant(x.AccessPlan, x.BookIds)).ToList(),
            IsOneTimePayment = !isSubscription,
            IsMonthlySubscription = isSubscription && frequency is "" or "monthly",
            PaidUntil = () => PaidUntil(payload.Subscription, eventAt),
            FrontendBaseUrl = _options.FrontendBaseUrl,
        }, ct);
    }

    /// <summary>
    /// End of the paid period: customer_access.access_until, else next_payment (both UTC).
    /// Without the Subscription block, a monthly payment covers one month from its approval.
    /// </summary>
    private static DateTimeOffset PaidUntil(KiwifySubscription? subscription, DateTimeOffset approvedAt)
    {
        var value = FirstFilled(subscription?.CustomerAccess?.AccessUntil, subscription?.NextPayment);
        if (value is null) return approvedAt.AddMonths(1);
        if (DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var date))
            return date;
        throw new ArgumentException("Validade da assinatura invalida no webhook.");
    }

    private DateTimeOffset ParseLocal(string? value)
    {
        if (DateTime.TryParseExact(value, LocalDateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var local))
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(_options.EventTimeZoneId);
            return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), zone));
        }
        // ISO dates must carry an explicit offset; never interpret them using the server timezone.
        if (value is not null && (value.EndsWith('Z') || value.LastIndexOf('+') > 9 || value.LastIndexOf('-') > 9)
            && DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var offset))
            return offset.ToUniversalTime();
        throw new ArgumentException("Data ausente ou invalida no webhook.");
    }

    private static string? FirstFilled(params string?[] values) =>
        values.Select(x => x?.Trim()).FirstOrDefault(x => !string.IsNullOrEmpty(x));
}
