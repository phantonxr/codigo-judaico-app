using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Endpoints;

public static class AdminEndpoints
{
    private const string PendingCheckoutPlanStatus = "Checkout pendente";
    private const int MaxSubscribersResultSize = 500;

    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization()
            .AddEndpointFilter<RequireMasterUserEndpointFilter>();

        group.MapGet("/subscribers", async (
            string? search,
            string? status,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var scopedQuery = ApplySearch(BuildSubscriberQuery(dbContext), search);

            var totalSubscribers = await scopedQuery.CountAsync(cancellationToken);
            var activeSubscribers = await scopedQuery.CountAsync(
                x => x.AccessEnabled && (!x.NextChargeDate.HasValue || x.NextChargeDate.Value >= today),
                cancellationToken);
            var pendingSubscribers = await scopedQuery.CountAsync(
                x => x.PlanStatus == PendingCheckoutPlanStatus,
                cancellationToken);
            var expiredSubscribers = await scopedQuery.CountAsync(
                x => x.PlanStatus != PendingCheckoutPlanStatus
                    && (!x.AccessEnabled || (x.NextChargeDate.HasValue && x.NextChargeDate.Value < today)),
                cancellationToken);

            var subscribers = await ApplyStatus(scopedQuery, status, today)
                .OrderByDescending(x => x.UpdatedAt)
                .ThenBy(x => x.Email)
                .Take(MaxSubscribersResultSize)
                .ToListAsync(cancellationToken);

            return Results.Ok(new AdminSubscribersResponse(
                totalSubscribers,
                activeSubscribers,
                expiredSubscribers,
                pendingSubscribers,
                subscribers.Select(x => x.ToAdminSubscriberDto(today)).ToList()));
        })
        .WithName("ListAdminSubscribers");

        return app;
    }

    private static IQueryable<AppUser> BuildSubscriberQuery(AppDbContext dbContext)
    {
        return dbContext.Users
            .AsNoTracking()
            .Where(x => !x.IsMasterUser)
            .Where(x =>
                x.AccessGrantedAt != null
                || x.AccessEnabled
                || x.NextChargeDate != null
                || x.PlanName != string.Empty
                || x.StripeCustomerId != string.Empty
                || x.StripeSubscriptionId != string.Empty
                || x.LastStripeCheckoutSessionId != string.Empty);
    }

    private static IQueryable<AppUser> ApplySearch(IQueryable<AppUser> query, string? search)
    {
        var normalizedSearch = ApiMappers.Clean(search).ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalizedSearch))
        {
            return query;
        }

        return query.Where(x =>
            x.Email.ToLower().Contains(normalizedSearch)
            || x.Name.ToLower().Contains(normalizedSearch)
            || x.PlanName.ToLower().Contains(normalizedSearch));
    }

    private static IQueryable<AppUser> ApplyStatus(
        IQueryable<AppUser> query,
        string? status,
        DateOnly today)
    {
        return ApiMappers.Clean(status).ToLowerInvariant() switch
        {
            "active" or "ativos" => query.Where(x =>
                x.AccessEnabled && (!x.NextChargeDate.HasValue || x.NextChargeDate.Value >= today)),
            "expired" or "vencidos" => query.Where(x =>
                x.PlanStatus != PendingCheckoutPlanStatus
                && (!x.AccessEnabled || (x.NextChargeDate.HasValue && x.NextChargeDate.Value < today))),
            "pending" or "pendentes" => query.Where(x => x.PlanStatus == PendingCheckoutPlanStatus),
            _ => query,
        };
    }

    private static AdminSubscriberDto ToAdminSubscriberDto(this AppUser user, DateOnly today)
    {
        var daysUntilExpiration = user.NextChargeDate.HasValue
            ? user.NextChargeDate.Value.DayNumber - today.DayNumber
            : (int?)null;

        return new AdminSubscriberDto(
            user.Id,
            user.Email,
            user.Name,
            user.PlanName,
            user.PlanStatus,
            user.NextChargeDate?.ToString("yyyy-MM-dd"),
            AppAccessEvaluator.HasPremiumAccess(user),
            user.AccessEnabled,
            daysUntilExpiration,
            user.AccessGrantedAt?.ToString("O"),
            user.CreatedAt.ToString("O"),
            user.UpdatedAt.ToString("O"),
            user.StripeCustomerId,
            user.StripeSubscriptionId,
            user.LastStripeCheckoutSessionId,
            user.HasUsedRenewalOffer);
    }
}
