using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Models;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;

namespace CodigoJudaico.Api.Services;

public sealed class StripeWebhookProcessor(
    AppDbContext dbContext,
    StripeBillingService stripeBillingService,
    PasswordHashService passwordHashService,
    AccessEmailService accessEmailService,
    ILogger<StripeWebhookProcessor> logger)
{
    public async Task ProcessAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                if (stripeEvent.Data.Object is Session checkoutSession)
                {
                    await HandleCheckoutSessionCompletedAsync(checkoutSession, cancellationToken);
                }
                break;

            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                if (stripeEvent.Data.Object is Subscription subscription)
                {
                    await HandleSubscriptionChangedAsync(subscription, cancellationToken);
                }
                break;
        }
    }

    public async Task<bool> TryReconcileCheckoutSessionAsync(
        string sessionId,
        CancellationToken cancellationToken)
    {
        var normalizedSessionId = ApiMappers.Clean(sessionId);

        if (string.IsNullOrWhiteSpace(normalizedSessionId))
        {
            return false;
        }

        var session = await stripeBillingService.GetCheckoutSessionAsync(normalizedSessionId, cancellationToken);
        return await TryGrantAccessFromCheckoutSessionAsync(session, cancellationToken);
    }

    public async Task<CheckoutSessionStatusResponse?> GetCheckoutStatusAsync(
        string sessionId,
        CancellationToken cancellationToken)
    {
        var session = await stripeBillingService.GetCheckoutSessionAsync(sessionId, cancellationToken);

        await TryGrantAccessFromCheckoutSessionAsync(session, cancellationToken);

        var subscription = await stripeBillingService.GetSubscriptionAsync(session.SubscriptionId, cancellationToken);
        var matchedPlan = await ResolveTrackedPlanAsync(session, subscription, cancellationToken);

        if (matchedPlan is null)
        {
            return null;
        }

        var email = ResolveSessionEmail(session);
        var planId = ReadMetadata(session.Metadata, StripeBillingService.PlanIdMetadataKey);
        var planName = ReadMetadata(session.Metadata, StripeBillingService.PlanNameMetadataKey);

        var user = string.IsNullOrWhiteSpace(email)
            ? null
            : await dbContext.Users.SingleOrDefaultAsync(
                x => x.Email == email,
                cancellationToken);

        return new CheckoutSessionStatusResponse(
            session.Id,
            session.Status ?? string.Empty,
            session.PaymentStatus ?? string.Empty,
            user?.AccessEnabled ?? false,
            email,
            string.IsNullOrWhiteSpace(planId) ? matchedPlan.Id : planId,
            string.IsNullOrWhiteSpace(planName) ? matchedPlan.PlanName : planName);
    }

    private async Task<bool> TryGrantAccessFromCheckoutSessionAsync(
        Session session,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(ApiMappers.Clean(session.Status), "complete", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var subscription = await stripeBillingService.GetSubscriptionAsync(session.SubscriptionId, cancellationToken);
        var matchedPlan = await ResolveTrackedPlanAsync(session, subscription, cancellationToken);

        if (matchedPlan is null)
        {
            logger.LogInformation(
                "Checkout {SessionId} concluido, mas ignorado na reconciliacao por nao pertencer a este app.",
                session.Id);
            return false;
        }

        await HandleCheckoutSessionCompletedAsync(session, cancellationToken);
        return true;
    }

    private async Task HandleCheckoutSessionCompletedAsync(Session session, CancellationToken cancellationToken)
    {
        var subscription = await stripeBillingService.GetSubscriptionAsync(session.SubscriptionId, cancellationToken);
        var matchedPlan = await ResolveTrackedPlanAsync(session, subscription, cancellationToken);

        if (matchedPlan is null)
        {
            logger.LogInformation(
                "Ignorando checkout Stripe {SessionId} porque nao pertence a este app ou nao usa os PriceIds configurados.",
                session.Id);
            return;
        }

        var email = ResolveSessionEmail(session);

        if (string.IsNullOrWhiteSpace(email))
        {
            logger.LogWarning("Checkout {SessionId} concluido sem e-mail associado.", session.Id);
            return;
        }

        var name = ReadMetadata(session.Metadata, StripeBillingService.NameMetadataKey);
        var planName = ReadMetadata(session.Metadata, StripeBillingService.PlanNameMetadataKey);
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var lastCompletedCheckoutSessionId = user?.LastStripeCheckoutSessionId;

        if (user is null)
        {
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = string.IsNullOrWhiteSpace(name) ? "Aluno" : name,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.Users.Add(user);
        }
        else if (!string.IsNullOrWhiteSpace(name))
        {
            user.Name = name;
        }

        var shouldSendAccessEmail =
            user.AccessEmailSentAt is null ||
            !string.Equals(lastCompletedCheckoutSessionId, session.Id, StringComparison.OrdinalIgnoreCase);
        var shouldGenerateFallbackPassword = string.IsNullOrWhiteSpace(user.PasswordHash);
        var plainPassword = shouldGenerateFallbackPassword
            ? passwordHashService.GenerateTemporaryPassword()
            : null;

        if (!string.IsNullOrWhiteSpace(plainPassword))
        {
            user.PasswordHash = passwordHashService.HashPassword(plainPassword);
        }

        ApplySubscriptionState(
            user,
            subscription,
            string.IsNullOrWhiteSpace(planName) ? matchedPlan.PlanName : planName);
        user.LastStripeCheckoutSessionId = session.Id;
        user.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        if (shouldSendAccessEmail)
        {
            await accessEmailService.SendAccessGrantedEmailAsync(user, plainPassword, cancellationToken);
            user.AccessEmailSentAt = DateTimeOffset.UtcNow;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task HandleSubscriptionChangedAsync(
        Subscription subscription,
        CancellationToken cancellationToken)
    {
        var matchedPlan = await ResolveTrackedPlanAsync(null, subscription, cancellationToken);

        if (matchedPlan is null)
        {
            logger.LogInformation(
                "Ignorando assinatura Stripe {SubscriptionId} porque nao pertence a este app ou nao usa os PriceIds configurados.",
                subscription.Id);
            return;
        }

        await ApplySubscriptionStateAsync(subscription, null, null, matchedPlan.PlanName, cancellationToken);
    }

    private async Task ApplySubscriptionStateAsync(
        Subscription subscription,
        string? fallbackEmail,
        string? fallbackName,
        string? fallbackPlanName,
        CancellationToken cancellationToken)
    {
        var user = await FindUserAsync(subscription, fallbackEmail, cancellationToken);

        if (user is null)
        {
            if (string.IsNullOrWhiteSpace(fallbackEmail))
            {
                return;
            }

            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = fallbackEmail,
                Name = string.IsNullOrWhiteSpace(fallbackName) ? "Aluno" : fallbackName,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            dbContext.Users.Add(user);
        }

        ApplySubscriptionState(user, subscription, fallbackPlanName);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<AppUser?> FindUserAsync(
        Subscription subscription,
        string? fallbackEmail,
        CancellationToken cancellationToken)
    {
        var subscriptionId = ApiMappers.Clean(subscription.Id);

        if (!string.IsNullOrWhiteSpace(subscriptionId))
        {
            var bySubscription = await dbContext.Users
                .SingleOrDefaultAsync(x => x.StripeSubscriptionId == subscriptionId, cancellationToken);

            if (bySubscription is not null)
            {
                return bySubscription;
            }
        }

        var customerId = ApiMappers.Clean(subscription.CustomerId);

        if (!string.IsNullOrWhiteSpace(customerId))
        {
            var byCustomer = await dbContext.Users
                .SingleOrDefaultAsync(x => x.StripeCustomerId == customerId, cancellationToken);

            if (byCustomer is not null)
            {
                return byCustomer;
            }
        }

        var email = ApiMappers.NormalizeEmail(fallbackEmail);

        if (!string.IsNullOrWhiteSpace(email))
        {
            return await dbContext.Users
                .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        }

        return null;
    }

    private static void ApplySubscriptionState(AppUser user, Subscription? subscription, string? fallbackPlanName)
    {
        var now = DateTimeOffset.UtcNow;
        var status = subscription?.Status ?? "active";

        user.AccessEnabled = IsAccessEnabled(status);
        user.AccessGrantedAt ??= user.AccessEnabled ? now : null;
        user.PlanName = !string.IsNullOrWhiteSpace(fallbackPlanName)
            ? fallbackPlanName
            : user.PlanName;
        user.PlanStatus = MapPlanStatus(status, subscription?.CancelAtPeriodEnd ?? false);
        user.NextChargeDate = ResolveNextChargeDate(subscription);
        user.StripeCustomerId = string.IsNullOrWhiteSpace(subscription?.CustomerId)
            ? user.StripeCustomerId
            : subscription!.CustomerId;
        user.StripeSubscriptionId = string.IsNullOrWhiteSpace(subscription?.Id)
            ? user.StripeSubscriptionId
            : subscription!.Id;
    }

    private static DateOnly? ResolveNextChargeDate(Subscription? subscription)
    {
        var firstItem = subscription?.Items?.Data?.FirstOrDefault();
        var currentPeriodEnd = firstItem?.CurrentPeriodEnd;

        if (currentPeriodEnd is null)
        {
            return null;
        }

        return DateOnly.FromDateTime(currentPeriodEnd.Value);
    }

    private static bool IsAccessEnabled(string? status)
    {
        return status is "active" or "trialing";
    }

    private static string MapPlanStatus(string? status, bool cancelAtPeriodEnd)
    {
        return status switch
        {
            "active" when cancelAtPeriodEnd => "Cancelamento agendado",
            "active" => "Ativo",
            "trialing" => "Em teste",
            "past_due" => "Pagamento pendente",
            "incomplete" => "Pagamento incompleto",
            "incomplete_expired" => "Expirado",
            "unpaid" => "Inadimplente",
            "paused" => "Pausado",
            "canceled" => "Cancelado",
            _ => "Ativo",
        };
    }

    private static string ResolveSessionEmail(Session session)
    {
        var metadataEmail = ReadMetadata(session.Metadata, StripeBillingService.EmailMetadataKey);
        var customerEmail = ApiMappers.Clean(session.CustomerEmail);
        var customerDetailsEmail = ApiMappers.Clean(session.CustomerDetails?.Email);

        return ApiMappers.NormalizeEmail(
            string.IsNullOrWhiteSpace(metadataEmail)
                ? string.IsNullOrWhiteSpace(customerDetailsEmail)
                    ? customerEmail
                    : customerDetailsEmail
                : metadataEmail);
    }

    private async Task<StripePlanDefinition?> ResolveTrackedPlanAsync(
        Session? session,
        Subscription? subscription,
        CancellationToken cancellationToken)
    {
        var matchedSubscriptionPlan = await stripeBillingService.MatchSubscriptionAsync(subscription, cancellationToken);

        if (matchedSubscriptionPlan is not null)
        {
            return matchedSubscriptionPlan;
        }

        if (subscription is not null
            && stripeBillingService.HasExpectedMetadata(subscription.Metadata)
            && stripeBillingService.TryGetConfiguredPlanById(
                ReadMetadata(subscription.Metadata, StripeBillingService.PlanIdMetadataKey),
                out var subscriptionPlan))
        {
            return subscriptionPlan;
        }

        if (session is not null
            && stripeBillingService.HasExpectedMetadata(session.Metadata)
            && stripeBillingService.TryGetConfiguredPlanById(
                ReadMetadata(session.Metadata, StripeBillingService.PlanIdMetadataKey),
                out var sessionPlan))
        {
            return sessionPlan;
        }

        return null;
    }

    private static string ReadMetadata(Dictionary<string, string>? metadata, string key)
    {
        if (metadata is null || !metadata.TryGetValue(key, out var value))
        {
            return string.Empty;
        }

        return ApiMappers.Clean(value);
    }
}
