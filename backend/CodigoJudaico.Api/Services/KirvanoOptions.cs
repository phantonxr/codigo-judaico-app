namespace CodigoJudaico.Api.Services;

public sealed class KirvanoOptions
{
    public const string SectionName = "Kirvano";
    public bool Enabled { get; set; }
    public string WebhookToken { get; set; } = string.Empty;
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public string EventTimeZoneId { get; set; } = "America/Sao_Paulo";
    public List<KirvanoOfferOptions> Offers { get; set; } = [];

    public bool IsValid()
    {
        if (!Enabled) return true;
        if (string.IsNullOrWhiteSpace(WebhookToken)
            || !Uri.TryCreate(FrontendBaseUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != "https" && uri.Scheme != "http")
            || Offers.Count == 0) return false;
        try { _ = TimeZoneInfo.FindSystemTimeZoneById(EventTimeZoneId); }
        catch (TimeZoneNotFoundException) { return false; }
        catch (InvalidTimeZoneException) { return false; }
        return Offers.All(x => !string.IsNullOrWhiteSpace(x.ProductId)
            && !string.IsNullOrWhiteSpace(x.OfferId)
            && x.ProductId.Length <= 120 && x.OfferId.Length <= 120
            && (x.AccessPlan is "" or "primeiro-acesso" or "vitalicio" or "mensal")
            && (x.AccessPlan.Length > 0 || x.BookIds.Length > 0)
            && x.BookIds.All(id => BookCatalog.FindById(id) is not null))
            && Offers.Select(x => (x.ProductId, x.OfferId)).Distinct().Count() == Offers.Count;
    }
}

public sealed class KirvanoOfferOptions
{
    public string ProductId { get; set; } = string.Empty;
    public string OfferId { get; set; } = string.Empty;
    public string AccessPlan { get; set; } = string.Empty;
    public string[] BookIds { get; set; } = [];
}
