using System.Globalization;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed class KirvanoWebhookProcessor(
    AppDbContext db, IOptions<KirvanoOptions> options,
    PasswordHashService passwords, SessionTokenService tokens,
    AccessEmailService emails, IOptions<ResendOptions> resendOptions)
{
    private readonly KirvanoOptions _options = options.Value;

    public async Task<string> ProcessAsync(KirvanoWebhookPayload payload, CancellationToken ct)
    {
        var eventName = ApiMappers.Clean(payload.Event);
        var isApproval = eventName is "SALE_APPROVED" or "SUBSCRIPTION_RENEWED";
        var isReversal = eventName is "SALE_REFUNDED" or "SALE_CHARGEBACK";
        var isSubscriptionChange = eventName is "SUBSCRIPTION_CANCELED" or "SUBSCRIPTION_EXPIRED";
        if (!isApproval && !isReversal && !isSubscriptionChange) return "ignored";

        var saleId = ApiMappers.Clean(payload.SaleId);
        if (saleId.Length is 0 or > 120) throw new ArgumentException("sale_id invalido.");
        if (ApiMappers.Clean(payload.CheckoutId).Length > 120) throw new ArgumentException("checkout_id invalido.");
        var eventAt = ParseTimestamp(payload.CreatedAt);
        if (isApproval && payload.Status != "APPROVED") throw new ArgumentException("Compra sem status APPROVED.");
        if (eventName == "SALE_REFUNDED" && payload.Status != "REFUNDED"
            || eventName == "SALE_CHARGEBACK" && payload.Status != "CHARGEBACK")
            throw new ArgumentException("Status inconsistente com o evento.");

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
                var bindings = (payload.Products ?? [])
                    .Where(x => x is not null)
                    .SelectMany(product => _options.Offers.Where(binding =>
                        binding.ProductId == product.Id && binding.OfferId == product.OfferId))
                    .Distinct().ToList();
                if (bindings.Count == 0) return "ignored";
                var plans = bindings.Select(x => x.AccessPlan).Where(x => x.Length > 0).Distinct().ToList();
                if (plans.Count > 1) throw new ArgumentException("Compra com planos de acesso conflitantes.");
                var plan = plans.SingleOrDefault() ?? string.Empty;
                var recurring = plan == "mensal";
                if (recurring && (payload.Type != "RECURRING" || payload.Plan?.ChargeFrequency != "MONTHLY"))
                    throw new ArgumentException("A oferta mensal exige assinatura MONTHLY/RECURRING.");
                if (!recurring && (payload.Type != "ONE_TIME" || eventName == "SUBSCRIPTION_RENEWED"))
                    throw new ArgumentException("A oferta exige pagamento unico ONE_TIME.");

                DateOnly? expiresAt = plan switch
                {
                    "primeiro-acesso" => DateOnly.FromDateTime(eventAt.UtcDateTime).AddDays(21),
                    "mensal" => DateOnly.FromDateTime(ParseTimestamp(payload.Plan!.NextChargeDate).UtcDateTime),
                    _ => null
                };
                if (recurring && expiresAt <= DateOnly.FromDateTime(eventAt.UtcDateTime))
                    throw new ArgumentException("next_charge_date deve ser posterior ao pagamento.");

                var email = ApiMappers.NormalizeEmail(payload.Customer?.Email);
                if (email.Length > 320 || !ApiMappers.IsValidEmail(email)) throw new ArgumentException("E-mail do comprador invalido.");
                await LockAsync("email:" + email, ct);
                var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, ct);
                if (sale?.UserId is not null && sale.UserId != user?.Id)
                    throw new ArgumentException("sale_id ja pertence a outro comprador.");
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
                        user = new AppUser
                        {
                            Id = Guid.NewGuid(), Email = email,
                            Name = string.IsNullOrWhiteSpace(payload.Customer?.Name) ? "Aluno" : payload.Customer.Name.Trim()[..Math.Min(payload.Customer.Name.Trim().Length, 120)],
                            // Only a hash is stored. The e-mail carries a short-lived password setup link.
                            PasswordHash = passwords.HashPassword(passwords.GenerateTemporaryPassword()),
                            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                        };
                        db.Users.Add(user);
                    }
                    sale ??= AddSale(saleId, payload.CheckoutId);
                    sale.UserId = user.Id;
                    sale.ApprovedAt ??= eventAt;
                    sale.LastEventAt = eventAt;
                    sale.Status = "APPROVED";
                    sale.AccessPlan = plan;
                    sale.AccessExpiresAt = expiresAt;
                    // Freeze each sale's book entitlements: later configuration changes do not grant extras on replay.
                    if (firstApproval)
                    {
                        foreach (var bookId in BookCatalog.ExpandWithPurchaseBonuses(bindings.SelectMany(x => x.BookIds)))
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
                sale ??= AddSale(saleId, payload.CheckoutId);
                if (isSubscriptionChange && sale.ApprovedAt is not null && sale.AccessPlan != "mensal")
                    return "ignored";
                sale.LastEventAt = eventAt;
                sale.Status = eventName switch
                {
                    "SALE_REFUNDED" => "REFUNDED",
                    "SALE_CHARGEBACK" => "CHARGEBACK",
                    "SUBSCRIPTION_CANCELED" => "CANCELED",
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

        if (isApproval) await NotifyAsync(saleId, ct);
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

    private async Task NotifyAsync(string saleId, CancellationToken ct)
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
        await emails.SendKirvanoPurchaseEmailAsync(sale.User, PlanName(sale.AccessPlan),
            sale.Books.Select(x => x.BookId).ToList(), rawToken, _options.FrontendBaseUrl, ct);
        sale.EmailSentAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private Task LockAsync(string key, CancellationToken ct) => db.Database.IsNpgsql()
        ? db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({'K' + key}, 0))", ct)
        : Task.CompletedTask;

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

    private static string PlanName(string? plan) => plan switch
    {
        "primeiro-acesso" => "Primeiro Acesso", "vitalicio" => "Acesso Vitalicio",
        "mensal" => "Premium Mensal", _ => string.Empty
    };
}
