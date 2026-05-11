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

            var subscriberData = await ApplyStatus(scopedQuery, status, today)
                .OrderByDescending(x => x.UpdatedAt)
                .ThenBy(x => x.Email)
                .Take(MaxSubscribersResultSize)
                .Select(x => new
                {
                    User = x,
                    LastLoginAt = x.Sessions
                        .OrderByDescending(s => s.CreatedAt)
                        .Select(s => (DateTimeOffset?)s.CreatedAt)
                        .FirstOrDefault(),
                    TotalLogins = x.Sessions.Count(),
                    LessonsCompleted = x.LessonProgressEntries.Count(lp => lp.Completed),
                    MentorMessagesCount = x.MentorMessages.Count(m => m.Role == "user"),
                })
                .ToListAsync(cancellationToken);

            return Results.Ok(new AdminSubscribersResponse(
                totalSubscribers,
                activeSubscribers,
                expiredSubscribers,
                pendingSubscribers,
                subscriberData.Select(x => x.User.ToAdminSubscriberDto(
                    today, x.LastLoginAt, x.TotalLogins, x.LessonsCompleted, x.MentorMessagesCount)).ToList()));
        })
        .WithName("ListAdminSubscribers");

        group.MapGet("/checkout-recoveries", async (
            string? search,
            string? status,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var query = dbContext.CheckoutRecoveries
                .AsNoTracking()
                .Include(x => x.User)
                .AsQueryable();

            var normalizedSearch = ApiMappers.Clean(search).ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                query = query.Where(x =>
                    x.Email.ToLower().Contains(normalizedSearch)
                    || x.User.Name.ToLower().Contains(normalizedSearch));
            }

            var normalizedStatus = ApiMappers.Clean(status).ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedStatus))
            {
                query = query.Where(x => x.Status == normalizedStatus);
            }

            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Take(500)
                .Select(x => new
                {
                    x.Id,
                    x.Email,
                    UserName = x.User.Name,
                    x.PlanName,
                    x.Status,
                    x.NextEmailStep,
                    x.SentCount,
                    x.StopReason,
                    CreatedAt = x.CreatedAt.ToString("O"),
                    CheckoutCreatedAt = x.CheckoutCreatedAt.ToString("O"),
                    PersuasiveEmailSentAt = (string?)( x.PersuasiveEmailSentAt != null ? x.PersuasiveEmailSentAt.Value.ToString("O") : null),
                    PersuasiveEmailOpenedAt = (string?)(x.PersuasiveEmailOpenedAt != null ? x.PersuasiveEmailOpenedAt.Value.ToString("O") : null),
                    DiscountEmailSentAt = (string?)(x.DiscountEmailSentAt != null ? x.DiscountEmailSentAt.Value.ToString("O") : null),
                    DiscountEmailOpenedAt = (string?)(x.DiscountEmailOpenedAt != null ? x.DiscountEmailOpenedAt.Value.ToString("O") : null),
                    CompletedAt = (string?)(x.CompletedAt != null ? x.CompletedAt.Value.ToString("O") : null),
                    StoppedAt = (string?)(x.StoppedAt != null ? x.StoppedAt.Value.ToString("O") : null),
                })
                .ToListAsync(cancellationToken);

            return Results.Ok(new { items });
        })
        .WithName("ListAdminCheckoutRecoveries");

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

    private static AdminSubscriberDto ToAdminSubscriberDto(
        this AppUser user,
        DateOnly today,
        DateTimeOffset? lastLoginAt,
        int totalLogins,
        int lessonsCompleted,
        int mentorMessagesCount)
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
            user.HasUsedRenewalOffer,
            lastLoginAt?.ToString("O"),
            totalLogins,
            user.HasCompletedAssessment,
            lessonsCompleted,
            mentorMessagesCount,
            user.UtmSource);
    }
}
