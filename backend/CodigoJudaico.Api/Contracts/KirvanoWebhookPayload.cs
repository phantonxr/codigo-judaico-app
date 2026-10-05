using System.Text.Json.Serialization;

namespace CodigoJudaico.Api.Contracts;

public sealed class KirvanoWebhookPayload
{
    [JsonPropertyName("event")] public string Event { get; set; } = string.Empty;
    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
    [JsonPropertyName("sale_id")] public string SaleId { get; set; } = string.Empty;
    [JsonPropertyName("checkout_id")] public string CheckoutId { get; set; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
    [JsonPropertyName("created_at")] public string CreatedAt { get; set; } = string.Empty;
    [JsonPropertyName("customer")] public KirvanoCustomer? Customer { get; set; }
    [JsonPropertyName("plan")] public KirvanoPlan? Plan { get; set; }
    [JsonPropertyName("products")] public List<KirvanoProduct> Products { get; set; } = [];
}

public sealed class KirvanoCustomer
{
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
}

public sealed class KirvanoProduct
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("offer_id")] public string OfferId { get; set; } = string.Empty;
    [JsonPropertyName("is_order_bump")] public bool IsOrderBump { get; set; }
}

public sealed class KirvanoPlan
{
    [JsonPropertyName("charge_frequency")] public string ChargeFrequency { get; set; } = string.Empty;
    [JsonPropertyName("next_charge_date")] public string NextChargeDate { get; set; } = string.Empty;
}
