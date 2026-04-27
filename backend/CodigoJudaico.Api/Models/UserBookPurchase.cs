namespace CodigoJudaico.Api.Models;

public sealed class UserBookPurchase
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string BookId { get; set; } = string.Empty;
    public string StripeSessionId { get; set; } = string.Empty;
    public DateTimeOffset PurchasedAt { get; set; }
    public AppUser User { get; set; } = null!;
}
