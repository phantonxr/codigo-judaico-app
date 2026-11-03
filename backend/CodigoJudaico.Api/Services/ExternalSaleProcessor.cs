using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public enum ExternalSaleEventKind { Approval, Renewal, Refund, Chargeback, Cancellation, Expiration }

/// <summary>What one configured offer of an external platform grants: an access plan and/or books.</summary>
public sealed record ExternalOfferGrant(string AccessPlan, IReadOnlyList<string> BookIds);

/// <summary>
/// A purchase event from an external checkout (Kirvano, Kiwify), already validated and translated
/// by the provider-specific processor. The rules for granting and revoking access live in
/// <see cref="ExternalSaleProcessor"/> and are the same for every provider.
/// </summary>
public sealed class ExternalSaleEvent
{
    /// <summary>Name shown to the buyer in the purchase e-mail.</summary>
    public required string Provider { get; init; }
    /// <summary>Stable key of the sale in <c>kirvano_sales</c>; providers other than Kirvano use a prefix.</summary>
    public required string SaleId { get; init; }
    public string CheckoutId { get; init; } = string.Empty;
    public required ExternalSaleEventKind Kind { get; init; }
    public required DateTimeOffset EventAt { get; init; }
    public string CustomerEmail { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    /// <summary>Configured offers recognized in the purchase (only used by approvals).</summary>
    public IReadOnlyList<ExternalOfferGrant> Grants { get; init; } = [];
    public bool IsOneTimePayment { get; init; }
    public bool IsMonthlySubscription { get; init; }
    /// <summary>End of the paid monthly period. Only evaluated for monthly access; may throw ArgumentException.</summary>
    public Func<DateTimeOffset>? PaidUntil { get; init; }
    public required string FrontendBaseUrl { get; init; }
}

/// <summary>
/// Stores external sales and keeps the buyer's external access and books in sync with them.
/// All providers share <c>kirvano_sales</c> and the <c>Kirvano*</c> access fields of the user,
/// so the access shown in the app combines every external purchase of the buyer.
/// </summary>
public sealed class ExternalSaleProcessor(
    AppDbContext db, PasswordHashService passwords, SessionTokenService tokens,
    AccessEmailService emails, IOptions<ResendOptions> resendOptions)
{
    public async Task<string> ProcessAsync(ExternalSaleEvent e, CancellationToken ct)
    {
        var isApproval = e.Kind is ExternalSaleEventKind.Approval or ExternalSaleEventKind.Renewal;
        var isReversal = e.Kind is ExternalSaleEventKind.Refund or ExternalSaleEventKind.Chargeback;
        var isSubscriptionChange = e.Kind is ExternalSaleEventKind.Cancellation or ExternalSaleEventKind.Expiration;
        var saleId = ApiMappers.Clean(e.SaleId);
        if (saleId.Length is 0 or > 120) throw new ArgumentException("Identificador da venda invalido.");
        if (ApiMappers.Clean(e.CheckoutId).Length > 120) throw new ArgumentException("Identificador do checkout invalido.");
        var eventAt = e.EventAt;

        var result = "processed";
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            await LockAsync("sale:" + saleId, ct);
            var sale = await db.KirvanoSales.Include(x => x.Books)
                .SingleOrDefaultAsync(x => x.SaleId == saleId, ct);

            if (sale?.Status is "REFUNDED" or "CHARGEBACK" or "ACCOUNT_DELETED")
            {
                // Reversals and deleted-account tombstones cannot be reactivated by later deliveries.
                return "ignored";
            }
            if (!isReversal && sale is not null && eventAt < sale.LastEventAt)
            {
                if (!isApproval) return "ignored";
                // A stale approval must not change rights, but may retry a previously failed e-mail.
                result = "ignored";
            }

            if (isApproval && result != "ignored")
            {
                var grants = e.Grants;
                if (grants.Count == 0) return "ignored";
                var plans = grants.Select(x => x.AccessPlan).Where(x => x.Length > 0).Distinct().ToList();
                if (plans.Count > 1) throw new ArgumentException("Compra com planos de acesso conflitantes.");
                var plan = plans.SingleOrDefault() ?? string.Empty;
                var recurring = plan == "mensal";
                if (recurring && !e.IsMonthlySubscription)
                    throw new ArgumentException("A oferta mensal exige uma assinatura mensal.");
                if (!recurring && (!e.IsOneTimePayment || e.Kind == ExternalSaleEventKind.Renewal))
                    throw new ArgumentException("A oferta exige pagamento unico.");

                DateOnly? expiresAt = plan switch
                {
                    "primeiro-acesso" => DateOnly.FromDateTime(eventAt.UtcDateTime).AddDays(21),
                    "mensal" => DateOnly.FromDateTime((e.PaidUntil
                        ?? throw new ArgumentException("Assinatura sem data de validade."))().UtcDateTime),
                    _ => null
                };
                if (recurring && expiresAt <= DateOnly.FromDateTime(eventAt.UtcDateTime))
                    throw new ArgumentException("A validade da assinatura deve ser posterior ao pagamento.");

                var email = ApiMappers.NormalizeEmail(e.CustomerEmail);
                if (email.Length > 320 || !ApiMappers.IsValidEmail(email)) throw new ArgumentException("E-mail do comprador invalido.");
                await LockAsync("email:" + email, ct);
                var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, ct);
                if (sale?.UserId is not null && sale.UserId != user?.Id)
                    throw new ArgumentException("A venda ja pertence a outro comprador.");
                var firstApproval = sale?.ApprovedAt is null;
                if (!firstApproval && sale!.AccessPlan != plan)
                    throw new ArgumentException("Nao e possivel alterar o plano de uma venda existente.");

                if (sale?.ApprovedAt is not null && (!recurring || expiresAt <= sale.AccessExpiresAt))
                {
                    result = "duplicate";
                }
                else
                {
                    if (user is null)
                    {
                        var name = ApiMappers.Clean(e.CustomerName);
                        user = new AppUser
                        {
                            Id = Guid.NewGuid(), Email = email,
                            Name = name.Length == 0 ? "Aluno" : name[..Math.Min(name.Length, 120)],
                            // Only a hash is stored. The e-mail carries a short-lived password setup link.
                            PasswordHash = passwords.HashPassword(passwords.GenerateTemporaryPassword()),
                            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                        };
                        db.Users.Add(user);
                    }
                    sale ??= AddSale(saleId, e.CheckoutId);
                    sale.UserId = user.Id;
                    sale.ApprovedAt ??= eventAt;
                    sale.LastEventAt = eventAt;
                    sale.Status = "APPROVED";
                    sale.AccessPlan = plan;
                    sale.AccessExpiresAt = expiresAt;
                    // Freeze each sale's book entitlements: later configuration changes do not grant extras on replay.
                    if (firstApproval)
                    {
                        foreach (var bookId in BookCatalog.ExpandWithPurchaseBonuses(grants.SelectMany(x => x.BookIds)))
                            sale.Books.Add(new KirvanoSaleBook { SaleId = saleId, BookId = bookId });
                    }
                    if (plan.Length > 0) user.AccessGrantedAt ??= eventAt;
                    await db.SaveChangesAsync(ct);
                    await RefreshAccessAsync(user, ct);
                    await db.SaveChangesAsync(ct);
                }
            }
            else if (!isApproval)
            {
                sale ??= AddSale(saleId, e.CheckoutId);
                if (isSubscriptionChange && sale.ApprovedAt is not null && sale.AccessPlan != "mensal")
                    return "ignored";
                sale.LastEventAt = eventAt;
                sale.Status = e.Kind switch
                {
                    ExternalSaleEventKind.Refund => "REFUNDED",
                    ExternalSaleEventKind.Chargeback => "CHARGEBACK",
                    ExternalSaleEventKind.Cancellation => "CANCELED",
                    _ => "EXPIRED"
                };
                if (sale.UserId is { } userId)
                {
                    var user = await db.Users.SingleAsync(x => x.Id == userId, ct);
                    await LockAsync("email:" + user.Email, ct);
                    await db.Entry(user).ReloadAsync(ct);
                    await db.SaveChangesAsync(ct);
                    await RefreshAccessAsync(user, ct);
                }
                await db.SaveChangesAsync(ct);
            }
            await transaction.CommitAsync(ct);
        }

        if (isApproval) await NotifyAsync(saleId, e.Provider, e.FrontendBaseUrl, ct);
        return result;
    }

    private KirvanoSale AddSale(string saleId, string? checkoutId)
    {
        var sale = new KirvanoSale { SaleId = saleId, CheckoutId = ApiMappers.Clean(checkoutId) };
        db.KirvanoSales.Add(sale);
        return sale;
    }

    private async Task RefreshAccessAsync(AppUser user, CancellationToken ct)
    {
        var sales = await db.KirvanoSales.Where(x => x.UserId == user.Id && x.ApprovedAt != null && x.AccessPlan != "")
            .ToListAsync(ct);
        var entitled = sales.Where(x => x.Status is "APPROVED" or "CANCELED")
            .OrderByDescending(x => x.AccessExpiresAt is null)
            .ThenByDescending(x => x.AccessExpiresAt).FirstOrDefault();
        var display = entitled ?? sales.OrderByDescending(x => x.LastEventAt).FirstOrDefault();
        user.KirvanoAccessEnabled = entitled is not null;
        user.KirvanoAccessExpiresAt = entitled?.AccessExpiresAt ?? display?.AccessExpiresAt;
        // A lifetime entitlement must not inherit the expiry of another sale.
        if (entitled is not null) user.KirvanoAccessExpiresAt = entitled.AccessExpiresAt;
        user.KirvanoPlanName = PlanName(display?.AccessPlan);
        user.KirvanoPlanStatus = entitled?.Status == "CANCELED" ? "Cancelamento agendado"
            : entitled is not null ? "Ativo" : display?.Status switch
            {
                "REFUNDED" => "Reembolsado", "CHARGEBACK" => "Chargeback",
                "EXPIRED" => "Expirado", _ => string.Empty
            };
        user.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private async Task NotifyAsync(string saleId, string provider, string frontendBaseUrl, CancellationToken ct)
    {
        if (!resendOptions.Value.Enabled) return;
        // Purchase rights are already committed. A delivery error produces 503 so the event can be replayed.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await LockAsync("sale:" + saleId, ct);
        db.ChangeTracker.Clear();
        var sale = await db.KirvanoSales.Include(x => x.User).Include(x => x.Books).SingleAsync(x => x.SaleId == saleId, ct);
        if (sale.EmailSentAt is not null || sale.User is null || sale.ApprovedAt is null
            || sale.Status is "REFUNDED" or "CHARGEBACK") return;
        await LockAsync("email:" + sale.User.Email, ct);
        var rawToken = tokens.GenerateToken();
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = sale.User.Id, TokenHash = tokens.HashToken(rawToken),
            CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddHours(2)
        });
        await db.SaveChangesAsync(ct);
        await emails.SendExternalPurchaseEmailAsync(sale.User, provider, PlanName(sale.AccessPlan),
            sale.Books.Select(x => x.BookId).ToList(), rawToken, frontendBaseUrl, ct);
        sale.EmailSentAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private Task LockAsync(string key, CancellationToken ct) => db.Database.IsNpgsql()
        ? db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({'K' + key}, 0))", ct)
        : Task.CompletedTask;

    private static string PlanName(string? plan) => plan switch
    {
        "primeiro-acesso" => "Primeiro Acesso", "vitalicio" => "Acesso Vitalicio",
        "mensal" => "Premium Mensal", _ => string.Empty
    };
}
