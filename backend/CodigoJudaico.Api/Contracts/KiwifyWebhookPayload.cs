using System.Text.Json.Serialization;

namespace CodigoJudaico.Api.Contracts;

/// <summary>
/// Fields of the Kiwify sales webhook used by the app. Root dates are Brasilia time
/// ("yyyy-MM-dd HH:mm"); dates inside Subscription are UTC ISO. See docs/webhook-kiwify.md.
/// </summary>
public sealed class KiwifyWebhookPayload
{
    [JsonPropertyName("order_id")] public string OrderId { get; set; } = string.Empty;
    [JsonPropertyName("order_status")] public string OrderStatus { get; set; } = string.Empty;
    [JsonPropertyName("webhook_event_type")] public string WebhookEventType { get; set; } = string.Empty;
    [JsonPropertyName("subscription_id")] public string? SubscriptionId { get; set; }
    [JsonPropertyName("created_at")] public string? CreatedAt { get; set; }
    [JsonPropertyName("updated_at")] public string? UpdatedAt { get; set; }
    [JsonPropertyName("approved_date")] public string? ApprovedDate { get; set; }
    [JsonPropertyName("refunded_at")] public string? RefundedAt { get; set; }
    [JsonPropertyName("Product")] public KiwifyProduct? Product { get; set; }
    [JsonPropertyName("Customer")] public KiwifyCustomer? Customer { get; set; }
    [JsonPropertyName("Subscription")] public KiwifySubscription? Subscription { get; set; }
}

public sealed class KiwifyProduct
{
    [JsonPropertyName("product_id")] public string ProductId { get; set; } = string.Empty;
    [JsonPropertyName("product_name")] public string ProductName { get; set; } = string.Empty;
}

public sealed class KiwifyCustomer
{
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("full_name")] public string FullName { get; set; } = string.Empty;
    [JsonPropertyName("first_name")] public string FirstName { get; set; } = string.Empty;
}

public sealed class KiwifySubscription
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
    [JsonPropertyName("next_payment")] public string? NextPayment { get; set; }
    [JsonPropertyName("customer_access")] public KiwifyCustomerAccess? CustomerAccess { get; set; }
    [JsonPropertyName("plan")] public KiwifyPlan? Plan { get; set; }
}

public sealed class KiwifyCustomerAccess
{
    [JsonPropertyName("has_access")] public bool HasAccess { get; set; }
    [JsonPropertyName("access_until")] public string? AccessUntil { get; set; }
}

public sealed class KiwifyPlan
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("frequency")] public string Frequency { get; set; } = string.Empty;
}
