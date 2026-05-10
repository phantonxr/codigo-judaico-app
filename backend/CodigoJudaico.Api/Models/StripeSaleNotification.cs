namespace CodigoJudaico.Api.Models;

public sealed class StripeSaleNotification
{
    public Guid Id { get; set; }
    public string StripeCheckoutSessionId { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public AppUser User { get; set; } = null!;
}
