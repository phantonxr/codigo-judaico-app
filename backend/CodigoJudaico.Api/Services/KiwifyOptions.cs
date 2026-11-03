namespace CodigoJudaico.Api.Services;

public sealed class KiwifyOptions
{
    public const string SectionName = "Kiwify";
    public bool Enabled { get; set; }
    /// <summary>Token of the webhook in Kiwify; signs each delivery (HMAC-SHA1 in ?signature=).</summary>
    public string WebhookToken { get; set; } = string.Empty;
    /// <summary>Old token accepted while rotating it (Kiwify retries may still be signed with it).</summary>
    public string PreviousWebhookToken { get; set; } = string.Empty;
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    /// <summary>Time zone of the root dates of the payload (Kiwify sends Brasilia time).</summary>
    public string EventTimeZoneId { get; set; } = "America/Sao_Paulo";
    public List<KiwifyProductOptions> Products { get; set; } = [];

    public bool IsValid()
    {
        if (!Enabled) return true;
        if (string.IsNullOrWhiteSpace(WebhookToken)
            || !Uri.TryCreate(FrontendBaseUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != "https" && uri.Scheme != "http")
            || Products.Count == 0) return false;
        try { _ = TimeZoneInfo.FindSystemTimeZoneById(EventTimeZoneId); }
        catch (TimeZoneNotFoundException) { return false; }
        catch (InvalidTimeZoneException) { return false; }
        return Products.All(x => !string.IsNullOrWhiteSpace(x.ProductId)
            && x.ProductId.Length <= 120 && x.PlanId.Length <= 120
            && (x.AccessPlan is "" or "primeiro-acesso" or "vitalicio" or "mensal")
            && (x.AccessPlan.Length > 0 || x.BookIds.Length > 0)
            && x.BookIds.All(id => BookCatalog.FindById(id) is not null))
            && Products.Select(x => (x.ProductId, x.PlanId)).Distinct().Count() == Products.Count;
    }
}

/// <summary>
/// What a Kiwify product grants. PlanId (optional) narrows the binding to one subscription plan
/// of the product; a binding without PlanId applies to every purchase of the product.
/// </summary>
public sealed class KiwifyProductOptions
{
    public string ProductId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string AccessPlan { get; set; } = string.Empty;
    public string[] BookIds { get; set; } = [];
}
