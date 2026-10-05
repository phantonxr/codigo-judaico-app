namespace CodigoJudaico.Api.Models;

public sealed class KirvanoSale
{
    public string SaleId { get; set; } = string.Empty;
    public string CheckoutId { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public AppUser? User { get; set; }
    public string Status { get; set; } = string.Empty;
    public string AccessPlan { get; set; } = string.Empty;
    public DateOnly? AccessExpiresAt { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public DateTimeOffset LastEventAt { get; set; }
    public DateTimeOffset? EmailSentAt { get; set; }
    public List<KirvanoSaleBook> Books { get; set; } = [];
}

public sealed class KirvanoSaleBook
{
    public string SaleId { get; set; } = string.Empty;
    public string BookId { get; set; } = string.Empty;
    public KirvanoSale Sale { get; set; } = null!;
}
