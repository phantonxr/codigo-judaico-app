using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Models;
using System.Linq.Expressions;

namespace CodigoJudaico.Api.Services;

public static class AppAccessEvaluator
{
    private const string PendingCheckoutPlanStatus = "Checkout pendente";

    public static bool HasPremiumAccess(AppUser? user)
    {
        if (user?.IsMasterUser == true)
        {
            return true;
        }

        return HasStripeAccess(user) || HasKirvanoAccess(user);
    }

    public static bool HasStripeAccess(AppUser? user) => user?.AccessEnabled == true
        && (!user.NextChargeDate.HasValue || user.NextChargeDate.Value >= DateOnly.FromDateTime(DateTime.UtcNow));

    public static bool HasKirvanoAccess(AppUser? user) => user?.KirvanoAccessEnabled == true
        && (!user.KirvanoAccessExpiresAt.HasValue || user.KirvanoAccessExpiresAt.Value >= DateOnly.FromDateTime(DateTime.UtcNow));

    public static Expression<Func<AppUser, bool>> ActiveAccessPredicate(DateOnly today) => user =>
        user.IsMasterUser
        || (user.AccessEnabled && (!user.NextChargeDate.HasValue || user.NextChargeDate.Value >= today))
        || (user.KirvanoAccessEnabled && (!user.KirvanoAccessExpiresAt.HasValue || user.KirvanoAccessExpiresAt.Value >= today));

    public static Expression<Func<AppUser, bool>> InactiveAccessPredicate(DateOnly today)
    {
        var active = ActiveAccessPredicate(today);
        return Expression.Lambda<Func<AppUser, bool>>(Expression.Not(active.Body), active.Parameters);
    }

    private static bool DisplayKirvanoPlan(AppUser user)
    {
        if (!HasStripeAccess(user)) return user.KirvanoPlanName.Length > 0;
        if (!HasKirvanoAccess(user) || user.NextChargeDate is null) return false;
        return user.KirvanoAccessExpiresAt is null || user.KirvanoAccessExpiresAt > user.NextChargeDate;
    }

    public static string EffectivePlanName(AppUser user) => DisplayKirvanoPlan(user) ? user.KirvanoPlanName : user.PlanName;
    public static string EffectivePlanStatus(AppUser user) => DisplayKirvanoPlan(user)
        ? (user.KirvanoAccessEnabled && !HasKirvanoAccess(user) ? "Expirado" : user.KirvanoPlanStatus) : user.PlanStatus;
    public static DateOnly? EffectiveExpiry(AppUser user) => DisplayKirvanoPlan(user) ? user.KirvanoAccessExpiresAt : user.NextChargeDate;

    public static bool HasAccessBonusEntitlement(AppUser? user) =>
        user?.IsMasterUser == true ||
        HasKirvanoAccess(user) ||
        user?.AccessEnabled == true ||
        user?.AccessGrantedAt is not null;

    public static bool HasPendingCheckout(AppUser? user)
    {
        return string.Equals(
            ApiMappers.Clean(user?.PlanStatus),
            PendingCheckoutPlanStatus,
            StringComparison.OrdinalIgnoreCase);
    }

    public static string? ResolvePlanId(string? planName)
    {
        var normalized = ApiMappers.Clean(planName).ToLowerInvariant();

        if (normalized.Contains("primeiro", StringComparison.Ordinal))
        {
            return "primeiro-acesso";
        }

        if (normalized.Contains("renov", StringComparison.Ordinal))
        {
            return "renovacao";
        }

        if (normalized.Contains("vital", StringComparison.Ordinal))
        {
            return "vitalicio";
        }

        if (normalized.Contains("anual", StringComparison.Ordinal))
        {
            return "anual";
        }

        if (normalized.Contains("mensal", StringComparison.Ordinal))
        {
            return "mensal";
        }

        return null;
    }
}
