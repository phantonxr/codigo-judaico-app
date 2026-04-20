using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Models;

namespace CodigoJudaico.Api.Services;

public static class AppAccessEvaluator
{
    private const string PendingCheckoutPlanStatus = "Checkout pendente";

    public static bool HasPremiumAccess(AppUser? user)
    {
        if (user is null || !user.AccessEnabled)
        {
            return false;
        }

        if (!user.NextChargeDate.HasValue)
        {
            return true;
        }

        return user.NextChargeDate.Value >= DateOnly.FromDateTime(DateTime.UtcNow);
    }

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
