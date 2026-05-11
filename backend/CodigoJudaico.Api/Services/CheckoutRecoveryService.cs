using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed record CheckoutRecoveryRedeemResult(string RedirectUrl, bool Found);

public sealed class CheckoutRecoveryService(
    AppDbContext dbContext,
    StripeBillingService stripeBillingService,
    AccessEmailService accessEmailService,
    IOptions<CheckoutRecoveryOptions> options,
    IOptions<StripeBillingOptions> stripeOptions,
    ILogger<CheckoutRecoveryService> logger)
{
    private const string PendingCheckoutPlanStatus = "Checkout pendente";

    public async Task ScheduleForCheckoutAsync(
        AppUser user,
        StripePlanDefinition plan,
        string checkoutSessionId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var recoveryOptions = options.Value;

        if (!recoveryOptions.Enabled)
        {
            return;
        }

        if (await HasUnsubscribedAsync(user.Email, cancellationToken))
        {
            logger.LogInformation(
                "Recuperacao de checkout nao agendada para {Email}; usuario fez opt-out anteriormente.",
                user.Email);
            return;
        }

        var recovery = await dbContext.CheckoutRecoveries
            .Where(x => x.UserId == user.Id)
            .Where(x => x.Status == CheckoutRecoveryStatus.Pending)
            .Where(x => x.StoppedAt == null)
            .OrderByDescending(x => x.CheckoutCreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (recovery is null)
        {
            recovery = new CheckoutRecovery
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Email = user.Email,
                PlanId = plan.Id,
                PlanName = plan.PlanName,
                OriginalStripeCheckoutSessionId = checkoutSessionId,
                CreatedAt = now,
                RecoveryTokenHash = HashToken(NewToken()),
                UnsubscribeTokenHash = HashToken(NewToken()),
            };

            dbContext.CheckoutRecoveries.Add(recovery);
        }

        recovery.Email = user.Email;
        recovery.PlanId = plan.Id;
        recovery.PlanName = plan.PlanName;
        recovery.LastStripeCheckoutSessionId = checkoutSessionId;
        recovery.CheckoutCreatedAt = now;
        recovery.Status = CheckoutRecoveryStatus.Pending;
        recovery.UpdatedAt = now;

        if (string.Equals(recovery.NextEmailStep, CheckoutRecoveryStep.Discount48h, StringComparison.OrdinalIgnoreCase))
        {
            recovery.NextSendAt = now.AddHours(NormalizeDelayHours(recoveryOptions.DiscountDelayHours, 48));
        }
        else if (!string.Equals(recovery.NextEmailStep, CheckoutRecoveryStep.Done, StringComparison.OrdinalIgnoreCase))
        {
            recovery.NextEmailStep = CheckoutRecoveryStep.Persuasive24h;
            recovery.NextSendAt = now.AddHours(NormalizeDelayHours(recoveryOptions.PersuasiveDelayHours, 24));
        }
    }

    public async Task ProcessDueRecoveriesAsync(CancellationToken cancellationToken)
    {
        var recoveryOptions = options.Value;

        if (!recoveryOptions.Enabled)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var batchSize = Math.Clamp(recoveryOptions.BatchSize, 1, 100);

        if (recoveryOptions.BackfillExistingPending)
        {
            await BackfillExistingPendingRecoveriesAsync(now, batchSize, cancellationToken);
        }

        var recoveries = await dbContext.CheckoutRecoveries
            .Include(x => x.User)
            .Where(x => x.Status == CheckoutRecoveryStatus.Pending)
            .Where(x => x.StoppedAt == null)
            .Where(x => x.NextSendAt <= now)
            .OrderBy(x => x.NextSendAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        foreach (var recovery in recoveries)
        {
            try
            {
                await ProcessOneAsync(recovery, now, cancellationToken);
            }
            catch (Exception ex)
            {
                recovery.NextSendAt = DateTimeOffset.UtcNow.AddHours(1);
                recovery.UpdatedAt = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);

                logger.LogError(
                    ex,
                    "Falha ao processar recuperacao de checkout {RecoveryId} para {Email}. Nova tentativa em 1h.",
                    recovery.Id,
                    recovery.Email);
            }
        }
    }

    private async Task BackfillExistingPendingRecoveriesAsync(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken)
    {
        var users = await dbContext.Users
            .Where(x => !x.IsMasterUser)
            .Where(x => x.PlanStatus == PendingCheckoutPlanStatus)
            .Where(x => x.LastStripeCheckoutSessionId != string.Empty)
            .Where(x => !dbContext.CheckoutRecoveries.Any(r => r.UserId == x.Id))
            .OrderBy(x => x.UpdatedAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        foreach (var user in users)
        {
            var planId = ResolvePlanIdFromPlanName(user.PlanName);
            if (string.IsNullOrWhiteSpace(planId))
            {
                continue;
            }

            StripePlanDefinition plan;
            try
            {
                plan = stripeBillingService.GetPlan(planId);
            }
            catch (InvalidOperationException)
            {
                continue;
            }

            var originalCheckoutCreatedAt = user.UpdatedAt == default
                ? user.CreatedAt
                : user.UpdatedAt;
            var scheduleBase = originalCheckoutCreatedAt <= now.AddHours(-24)
                ? now.AddHours(-24)
                : originalCheckoutCreatedAt;

            await ScheduleForCheckoutAsync(
                user,
                plan,
                user.LastStripeCheckoutSessionId,
                scheduleBase,
                cancellationToken);
        }

        if (users.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<CheckoutRecoveryRedeemResult> RedeemAsync(string token, CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(token);
        var now = DateTimeOffset.UtcNow;
        var frontendBaseUrl = stripeOptions.Value.FrontendBaseUrl.TrimEnd('/');
        var fallbackUrl = string.IsNullOrWhiteSpace(frontendBaseUrl)
            ? "/checkout"
            : $"{frontendBaseUrl}/checkout";

        var recovery = await dbContext.CheckoutRecoveries
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.RecoveryTokenHash == tokenHash, cancellationToken);

        if (recovery is null || recovery.RecoveryTokenExpiresAt < now)
        {
            return new CheckoutRecoveryRedeemResult(fallbackUrl, Found: false);
        }

        if (recovery.StoppedAt is not null
            || string.Equals(recovery.Status, CheckoutRecoveryStatus.Completed, StringComparison.OrdinalIgnoreCase))
        {
            return new CheckoutRecoveryRedeemResult($"{frontendBaseUrl}/login", Found: true);
        }

        if (ShouldStopForUser(recovery.User))
        {
            MarkStopped(recovery, CheckoutRecoveryStopReason.NoLongerPending, now);
            await dbContext.SaveChangesAsync(cancellationToken);
            return new CheckoutRecoveryRedeemResult($"{frontendBaseUrl}/login", Found: true);
        }

        var plan = await stripeBillingService.GetValidatedPlanAsync(recovery.PlanId, cancellationToken);
        var discount = BuildDiscountForRecovery(recovery, now);
        var response = await stripeBillingService.CreateCheckoutSessionAsync(
            new CheckoutSessionCreateRequest
            {
                Email = recovery.User.Email,
                Name = recovery.User.Name,
                PlanId = plan.Id,
                UtmSource = recovery.User.UtmSource,
                UtmMedium = recovery.User.UtmMedium,
                UtmCampaign = recovery.User.UtmCampaign,
                UtmTerm = recovery.User.UtmTerm,
                UtmContent = recovery.User.UtmContent,
                MarketingConsent = !string.IsNullOrWhiteSpace(recovery.User.FbClickId)
                    || !string.IsNullOrWhiteSpace(recovery.User.UtmSource),
                FbClickId = recovery.User.FbClickId,
            },
            plan,
            cancellationToken,
            books: null,
            discount: discount);

        recovery.LastStripeCheckoutSessionId = response.SessionId;
        recovery.UpdatedAt = now;
        recovery.User.LastStripeCheckoutSessionId = response.SessionId;
        recovery.User.PlanName = plan.PlanName;
        recovery.User.PlanStatus = PendingCheckoutPlanStatus;
        recovery.User.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return new CheckoutRecoveryRedeemResult(response.Url, Found: true);
    }

    public async Task<bool> UnsubscribeAsync(string token, CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(token);
        var now = DateTimeOffset.UtcNow;
        var recovery = await dbContext.CheckoutRecoveries
            .SingleOrDefaultAsync(x => x.UnsubscribeTokenHash == tokenHash, cancellationToken);

        if (recovery is null)
        {
            return false;
        }

        recovery.UnsubscribedAt = now;
        MarkStopped(recovery, CheckoutRecoveryStopReason.Unsubscribed, now);

        var otherPending = await dbContext.CheckoutRecoveries
            .Where(x => x.Email == recovery.Email)
            .Where(x => x.Id != recovery.Id)
            .Where(x => x.Status == CheckoutRecoveryStatus.Pending)
            .Where(x => x.StoppedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var other in otherPending)
        {
            other.UnsubscribedAt = now;
            MarkStopped(other, CheckoutRecoveryStopReason.Unsubscribed, now);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task MarkCompletedAsync(
        Guid userId,
        string? checkoutSessionId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var normalizedSessionId = ApiMappers.Clean(checkoutSessionId);
        var recoveries = await dbContext.CheckoutRecoveries
            .Where(x => x.UserId == userId
                || (!string.IsNullOrWhiteSpace(normalizedSessionId)
                    && x.LastStripeCheckoutSessionId == normalizedSessionId))
            .Where(x => x.Status == CheckoutRecoveryStatus.Pending
                || x.Status == CheckoutRecoveryStatus.SequenceCompleted)
            .Where(x => x.StoppedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var recovery in recoveries)
        {
            recovery.Status = CheckoutRecoveryStatus.Completed;
            recovery.CompletedAt = now;
            recovery.StoppedAt = now;
            recovery.StopReason = CheckoutRecoveryStopReason.Purchased;
            recovery.UpdatedAt = now;
        }

        if (recoveries.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<int> StopForInboundReplyAsync(
        string? from,
        IReadOnlyList<string> to,
        string? subject,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var recoveryId = ResolveRecoveryId(to);
        List<CheckoutRecovery> recoveries;

        if (recoveryId.HasValue)
        {
            recoveries = await dbContext.CheckoutRecoveries
                .Where(x => x.Id == recoveryId.Value)
                .Where(x => x.Status == CheckoutRecoveryStatus.Pending
                    || x.Status == CheckoutRecoveryStatus.SequenceCompleted)
                .Where(x => x.StoppedAt == null)
                .ToListAsync(cancellationToken);
        }
        else
        {
            var fromEmail = ExtractEmail(from);
            if (string.IsNullOrWhiteSpace(fromEmail))
            {
                return 0;
            }

            recoveries = await dbContext.CheckoutRecoveries
                .Where(x => x.Email == fromEmail)
                .Where(x => x.Status == CheckoutRecoveryStatus.Pending
                    || x.Status == CheckoutRecoveryStatus.SequenceCompleted)
                .Where(x => x.StoppedAt == null)
                .ToListAsync(cancellationToken);
        }

        foreach (var recovery in recoveries)
        {
            recovery.ReplyReceivedAt = now;
            recovery.ReplyFrom = ApiMappers.Clean(from);
            recovery.ReplySubject = ApiMappers.Clean(subject);
            MarkStopped(recovery, CheckoutRecoveryStopReason.Replied, now);
        }

        if (recoveries.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return recoveries.Count;
    }

    public async Task<int> StopForRecipientEmailAsync(
        string? recipientEmail,
        string reason,
        CancellationToken cancellationToken)
    {
        var email = ApiMappers.NormalizeEmail(ExtractEmail(recipientEmail));
        if (string.IsNullOrWhiteSpace(email))
        {
            email = ApiMappers.NormalizeEmail(recipientEmail);
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return 0;
        }

        var now = DateTimeOffset.UtcNow;
        var recoveries = await dbContext.CheckoutRecoveries
            .Where(x => x.Email == email)
            .Where(x => x.Status == CheckoutRecoveryStatus.Pending
                || x.Status == CheckoutRecoveryStatus.SequenceCompleted)
            .Where(x => x.StoppedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var recovery in recoveries)
        {
            recovery.UnsubscribedAt = now;
            MarkStopped(recovery, reason, now);
        }

        if (recoveries.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return recoveries.Count;
    }

    public async Task TrackEmailOpenedAsync(string? messageId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(messageId))
        {
            return;
        }

        var recovery = await dbContext.CheckoutRecoveries
            .Where(x => x.PersuasiveEmailResendId == messageId || x.DiscountEmailResendId == messageId)
            .FirstOrDefaultAsync(cancellationToken);

        if (recovery is null)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var changed = false;

        if (recovery.PersuasiveEmailResendId == messageId && recovery.PersuasiveEmailOpenedAt is null)
        {
            recovery.PersuasiveEmailOpenedAt = now;
            changed = true;
        }
        else if (recovery.DiscountEmailResendId == messageId && recovery.DiscountEmailOpenedAt is null)
        {
            recovery.DiscountEmailOpenedAt = now;
            changed = true;
        }

        if (changed)
        {
            recovery.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task ProcessOneAsync(
        CheckoutRecovery recovery,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (ShouldStopForUser(recovery.User))
        {
            MarkStopped(recovery, CheckoutRecoveryStopReason.NoLongerPending, now);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        switch (recovery.NextEmailStep)
        {
            case CheckoutRecoveryStep.Persuasive24h:
                await SendPersuasiveEmailAsync(recovery, now, cancellationToken);
                break;
            case CheckoutRecoveryStep.Discount48h:
                await SendDiscountEmailAsync(recovery, now, cancellationToken);
                break;
            default:
                recovery.Status = CheckoutRecoveryStatus.SequenceCompleted;
                recovery.UpdatedAt = now;
                await dbContext.SaveChangesAsync(cancellationToken);
                break;
        }
    }

    private async Task SendPersuasiveEmailAsync(
        CheckoutRecovery recovery,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var tokens = await RefreshTokensAsync(recovery, now, cancellationToken);
        var resendId = await accessEmailService.SendCheckoutRecoveryPersuasiveEmailAsync(
            recovery,
            tokens.RecoveryUrl,
            tokens.UnsubscribeUrl,
            BuildReplyToAddress(recovery),
            cancellationToken);

        recovery.PersuasiveEmailSentAt = now;
        recovery.PersuasiveEmailResendId = resendId;
        recovery.LastSentAt = now;
        recovery.SentCount++;
        recovery.NextEmailStep = CheckoutRecoveryStep.Discount48h;
        recovery.NextSendAt = Max(
            recovery.CheckoutCreatedAt.AddHours(NormalizeDelayHours(options.Value.DiscountDelayHours, 48)),
            now.AddMinutes(5));
        recovery.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SendDiscountEmailAsync(
        CheckoutRecovery recovery,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        await EnsureDiscountAsync(recovery, now, cancellationToken);

        var tokens = await RefreshTokensAsync(recovery, now, cancellationToken);
        var resendId = await accessEmailService.SendCheckoutRecoveryDiscountEmailAsync(
            recovery,
            tokens.RecoveryUrl,
            tokens.UnsubscribeUrl,
            BuildReplyToAddress(recovery),
            cancellationToken);

        recovery.DiscountEmailSentAt = now;
        recovery.DiscountEmailResendId = resendId;
        recovery.LastSentAt = now;
        recovery.SentCount++;
        recovery.NextEmailStep = CheckoutRecoveryStep.Done;
        recovery.Status = CheckoutRecoveryStatus.SequenceCompleted;
        recovery.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureDiscountAsync(
        CheckoutRecovery recovery,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var recoveryOptions = options.Value;

        if (!string.IsNullOrWhiteSpace(recovery.DiscountCode)
            || !string.IsNullOrWhiteSpace(recovery.StripePromotionCodeId))
        {
            return;
        }

        var discountExpiresAt = now.AddHours(Math.Clamp(recoveryOptions.DiscountExpiresHours, 1, 24 * 30));
        var fixedPromotionCodeId = ApiMappers.Clean(recoveryOptions.DiscountPromotionCodeId);
        var fixedDiscountCode = ApiMappers.Clean(recoveryOptions.DiscountCode);
        var couponId = ApiMappers.Clean(recoveryOptions.DiscountCouponId);

        if (!string.IsNullOrWhiteSpace(fixedPromotionCodeId))
        {
            recovery.StripePromotionCodeId = fixedPromotionCodeId;
            recovery.DiscountCode = string.IsNullOrWhiteSpace(fixedDiscountCode)
                ? recoveryOptions.DiscountLabel
                : fixedDiscountCode;
            recovery.DiscountExpiresAt = discountExpiresAt;
            recovery.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        if (!string.IsNullOrWhiteSpace(couponId))
        {
            var promotion = await stripeBillingService.CreateRecoveryPromotionCodeAsync(
                couponId,
                recovery.Email,
                discountExpiresAt,
                cancellationToken);

            recovery.StripePromotionCodeId = promotion.PromotionCodeId;
            recovery.DiscountCode = promotion.Code;
            recovery.DiscountExpiresAt = discountExpiresAt;
            recovery.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        if (!string.IsNullOrWhiteSpace(fixedDiscountCode))
        {
            recovery.DiscountCode = fixedDiscountCode;
            recovery.DiscountExpiresAt = discountExpiresAt;
            recovery.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        throw new InvalidOperationException(
            "CheckoutRecovery: configure DiscountCouponId, DiscountPromotionCodeId ou DiscountCode antes do envio de cupom.");
    }

    private StripeCheckoutDiscount? BuildDiscountForRecovery(
        CheckoutRecovery recovery,
        DateTimeOffset now)
    {
        if (!string.Equals(recovery.NextEmailStep, CheckoutRecoveryStep.Done, StringComparison.OrdinalIgnoreCase)
            && recovery.DiscountEmailSentAt is null)
        {
            return null;
        }

        if (recovery.DiscountExpiresAt is not null && recovery.DiscountExpiresAt <= now)
        {
            return null;
        }

        return string.IsNullOrWhiteSpace(recovery.StripePromotionCodeId)
            ? null
            : new StripeCheckoutDiscount(CouponId: null, PromotionCodeId: recovery.StripePromotionCodeId);
    }

    private async Task<(string RecoveryUrl, string UnsubscribeUrl)> RefreshTokensAsync(
        CheckoutRecovery recovery,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var recoveryToken = NewToken();
        var unsubscribeToken = NewToken();
        var tokenExpiresAt = now.AddDays(Math.Clamp(options.Value.TokenExpiresDays, 1, 90));

        recovery.RecoveryTokenHash = HashToken(recoveryToken);
        recovery.RecoveryTokenExpiresAt = tokenExpiresAt;
        recovery.UnsubscribeTokenHash = HashToken(unsubscribeToken);
        recovery.UnsubscribeTokenExpiresAt = tokenExpiresAt;
        recovery.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        var apiBaseUrl = ResolveApiBaseUrl().TrimEnd('/');
        return (
            $"{apiBaseUrl}/api/checkout-recoveries/{Uri.EscapeDataString(recoveryToken)}/checkout",
            $"{apiBaseUrl}/api/checkout-recoveries/unsubscribe/{Uri.EscapeDataString(unsubscribeToken)}");
    }

    private string ResolveApiBaseUrl()
    {
        var configured = ApiMappers.Clean(options.Value.ApiBaseUrl);

        return string.IsNullOrWhiteSpace(configured)
            ? stripeOptions.Value.FrontendBaseUrl
            : configured;
    }

    private string? BuildReplyToAddress(CheckoutRecovery recovery)
    {
        var pattern = ApiMappers.Clean(options.Value.ReplyToPattern);

        return string.IsNullOrWhiteSpace(pattern)
            ? null
            : pattern.Replace("{recoveryId}", recovery.Id.ToString("N"), StringComparison.OrdinalIgnoreCase)
                .Replace("{email}", recovery.Email, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<bool> HasUnsubscribedAsync(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = ApiMappers.NormalizeEmail(email);

        return await dbContext.CheckoutRecoveries
            .AnyAsync(
                x => x.Email == normalizedEmail
                    && (x.UnsubscribedAt != null
                        || x.ReplyReceivedAt != null
                        || x.StopReason == CheckoutRecoveryStopReason.Bounced
                        || x.StopReason == CheckoutRecoveryStopReason.Complained),
                cancellationToken);
    }

    private static bool ShouldStopForUser(AppUser user) =>
        AppAccessEvaluator.HasPremiumAccess(user)
        || (!string.Equals(user.PlanStatus, PendingCheckoutPlanStatus, StringComparison.OrdinalIgnoreCase)
            && user.AccessGrantedAt is not null);

    private static void MarkStopped(
        CheckoutRecovery recovery,
        string reason,
        DateTimeOffset now)
    {
        recovery.Status = reason == CheckoutRecoveryStopReason.Purchased
            ? CheckoutRecoveryStatus.Completed
            : CheckoutRecoveryStatus.Stopped;
        recovery.StoppedAt = now;
        recovery.StopReason = reason;
        recovery.UpdatedAt = now;
    }

    private static int NormalizeDelayHours(int configured, int fallback) =>
        configured > 0 ? configured : fallback;

    private static string ResolvePlanIdFromPlanName(string? planName)
    {
        var normalized = ApiMappers.Clean(planName).ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        if (normalized.Contains("renovacao", StringComparison.OrdinalIgnoreCase))
        {
            return "renovacao";
        }

        if (normalized.Contains("mensal", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("chodesh", StringComparison.OrdinalIgnoreCase))
        {
            return "mensal";
        }

        if (normalized.Contains("anual", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("shnat", StringComparison.OrdinalIgnoreCase))
        {
            return "anual";
        }

        if (normalized.Contains("vitalicio", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("legado", StringComparison.OrdinalIgnoreCase))
        {
            return "vitalicio";
        }

        return "primeiro-acesso";
    }

    private static DateTimeOffset Max(DateTimeOffset left, DateTimeOffset right) =>
        left > right ? left : right;

    private static string NewToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return string.Empty;
        }

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static Guid? ResolveRecoveryId(IReadOnlyList<string> addresses)
    {
        foreach (var address in addresses)
        {
            var match = Regex.Match(address ?? string.Empty, @"[+._-]([0-9a-fA-F]{32})@");

            if (match.Success && Guid.TryParseExact(match.Groups[1].Value, "N", out var id))
            {
                return id;
            }

            match = Regex.Match(address ?? string.Empty, @"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})");

            if (match.Success && Guid.TryParse(match.Groups[1].Value, out id))
            {
                return id;
            }
        }

        return null;
    }

    private static string ExtractEmail(string? value)
    {
        var input = ApiMappers.Clean(value).ToLowerInvariant();
        var match = Regex.Match(input, @"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}");
        return match.Success ? match.Value : string.Empty;
    }
}
