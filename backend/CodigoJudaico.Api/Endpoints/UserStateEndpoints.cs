using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class UserStateEndpoints
{
    private const int ConcurrentStateSaveRetryCount = 3;

    public static IEndpointRouteBuilder MapUserStateEndpoints(this IEndpointRouteBuilder app)
    {
        var privacyGroup = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization();

        privacyGroup.MapGet("/{userId:guid}/privacy/export", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var user = await dbContext.Users
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
            }

            var diagnosis = await dbContext.UserDiagnoses.AsNoTracking()
                .SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
            var journey = await dbContext.UserJourneyStates.AsNoTracking()
                .SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
            var lessonProgress = await dbContext.UserLessonProgressEntries.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.LessonId)
                .ToListAsync(cancellationToken);
            var mentorMessages = await dbContext.MentorChatMessages.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);
            var dailyFeedbacks = await dbContext.MentorDailyFeedbacks.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.Phase)
                .ThenBy(x => x.DayNumber)
                .ToListAsync(cancellationToken);
            var finalReports = await dbContext.MentorFinalReports.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);
            var mentorUsage = await dbContext.MentorUsages.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.Date)
                .ToListAsync(cancellationToken);
            var subscriptions = await dbContext.Subscriptions.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);
            var bookPurchases = await dbContext.UserBookPurchases.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.PurchasedAt)
                .ToListAsync(cancellationToken);
            var legalAcceptances = await dbContext.UserLegalAcceptances.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.AcceptedAt)
                .ToListAsync(cancellationToken);
            var sessions = await dbContext.AppSessions.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return Results.Ok(new
            {
                ExportedAt = DateTimeOffset.UtcNow,
                Account = new
                {
                    user.Id,
                    user.Email,
                    user.Name,
                    user.IsMasterUser,
                    user.HasCompletedAssessment,
                    user.AccessEnabled,
                    user.AccountCreatedEmailSentAt,
                    user.AccessGrantedAt,
                    user.AccessEmailSentAt,
                    user.PlanName,
                    user.PlanStatus,
                    user.NextChargeDate,
                    user.StripeCustomerId,
                    user.StripeSubscriptionId,
                    user.LastStripeCheckoutSessionId,
                    user.HasUsedRenewalOffer,
                    user.UtmSource,
                    user.UtmMedium,
                    user.UtmCampaign,
                    user.UtmTerm,
                    user.UtmContent,
                    user.CreatedAt,
                    user.UpdatedAt,
                },
                Diagnosis = diagnosis is null ? null : new
                {
                    diagnosis.TrackId,
                    diagnosis.TrackLabel,
                    diagnosis.ScoresJson,
                    diagnosis.Diagnostico,
                    diagnosis.Gatilho,
                    diagnosis.Sabedoria,
                    diagnosis.Proverbio,
                    diagnosis.Metodo,
                    diagnosis.AnsweredAt,
                    diagnosis.UpdatedAt,
                },
                Journey = journey is null ? null : new
                {
                    journey.AssignedTrack,
                    journey.JourneyStartDate,
                    journey.ProgressJson,
                    journey.CalendarJson,
                    journey.UpdatedAt,
                },
                LessonProgress = lessonProgress.Select(x => new
                {
                    x.LessonId,
                    x.Completed,
                    x.UpdatedAt,
                }),
                MentorMessages = mentorMessages.Select(x => new
                {
                    x.Id,
                    x.Role,
                    x.Content,
                    x.CreatedAt,
                }),
                MentorDailyFeedbacks = dailyFeedbacks.Select(x => new
                {
                    x.Id,
                    x.Phase,
                    x.DayNumber,
                    x.DetectedEmotion,
                    x.TriggerType,
                    x.ObservedPattern,
                    x.DetectedTrigger,
                    x.EmotionalPattern,
                    x.FinancialRisk,
                    x.JewishWisdom,
                    x.PracticalAction,
                    x.FeedbackText,
                    x.CreatedAt,
                }),
                MentorFinalReports = finalReports.Select(x => new
                {
                    x.Id,
                    x.ReportText,
                    x.TopTriggersJson,
                    x.EmotionalPattern,
                    x.FinancialRiskPattern,
                    x.NextStepRecommendation,
                    x.OfferShown,
                    x.CreatedAt,
                }),
                MentorUsage = mentorUsage.Select(x => new
                {
                    x.Id,
                    x.Date,
                    x.InteractionsCount,
                    x.PlanType,
                    x.CreatedAt,
                    x.UpdatedAt,
                }),
                Subscriptions = subscriptions.Select(x => new
                {
                    x.Id,
                    x.PlanName,
                    x.PlanType,
                    x.Status,
                    x.Price,
                    x.CheckoutUrl,
                    x.CreatedAt,
                    x.UpdatedAt,
                }),
                BookPurchases = bookPurchases.Select(x => new
                {
                    x.Id,
                    x.BookId,
                    x.StripeSessionId,
                    x.PurchasedAt,
                }),
                LegalAcceptances = legalAcceptances.Select(x => new
                {
                    x.Id,
                    x.TermsVersion,
                    x.PrivacyVersion,
                    x.DisclaimerVersion,
                    x.Language,
                    x.AcceptedAt,
                }),
                Sessions = sessions.Select(x => new
                {
                    x.Id,
                    x.CreatedAt,
                    x.ExpiresAt,
                    x.RevokedAt,
                }),
            });
        });

        privacyGroup.MapPost("/{userId:guid}/privacy/marketing-opt-out", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
            }

            ClearMarketingAttribution(user);
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.NoContent();
        });

        privacyGroup.MapPost("/{userId:guid}/privacy/account-deletion", async (
            Guid userId,
            PrivacyDeleteAccountRequest request,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
            }

            if (!string.Equals(ApiMappers.NormalizeEmail(request.Email), user.Email, StringComparison.OrdinalIgnoreCase))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["Confirm your account e-mail before deleting this account."]
                });
            }

            if (user.IsMasterUser)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["account"] = ["Master user accounts cannot be deleted from the self-service privacy screen."]
                });
            }

            await RemoveUserPersonalStateAsync(dbContext, userId, cancellationToken);
            AnonymizeUser(user);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.NoContent();
        });

        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization()
            .AddEndpointFilter<RequirePremiumAccessEndpointFilter>();

        group.MapGet("/{userId:guid}/bootstrap", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var user = await dbContext.Users
                .Include(x => x.Diagnosis)
                .Include(x => x.JourneyState)
                .Include(x => x.LessonProgressEntries)
                .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
            }

            var mentorMessages = await dbContext.MentorChatMessages
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return Results.Ok(user.ToBootstrap(user.LessonProgressEntries, mentorMessages));
        });

        group.MapPut("/{userId:guid}/profile", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            ProfileUpsertRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                user.Name = ApiMappers.Clean(request.Name);
            }

            if (!string.IsNullOrWhiteSpace(request.Plan))
            {
                user.PlanName = ApiMappers.Clean(request.Plan);
            }

            if (!string.IsNullOrWhiteSpace(request.PlanStatus))
            {
                user.PlanStatus = ApiMappers.Clean(request.PlanStatus);
            }
            else if (!string.IsNullOrWhiteSpace(user.PlanName) && string.IsNullOrWhiteSpace(user.PlanStatus))
            {
                user.PlanStatus = "Ativo";
            }

            if (!string.IsNullOrWhiteSpace(request.NextChargeDate))
            {
                user.NextChargeDate = ApiMappers.ParseDateOnly(request.NextChargeDate);
            }

            user.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(user.ToDto());
        });

        group.MapPut("/{userId:guid}/diagnosis", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            DiagnosisUpsertRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            for (var attempt = 0; attempt < ConcurrentStateSaveRetryCount; attempt++)
            {
                var user = await dbContext.Users
                    .Include(x => x.Diagnosis)
                    .Include(x => x.JourneyState)
                    .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

                if (user is null)
                {
                    return Results.NotFound();
                }

                // Assessment must not be redone once completed.
                // Keep this endpoint idempotent for the frontend sync: if a diagnosis already exists,
                // just return it and ensure journey state is consistent.
                if (user.HasCompletedAssessment && user.Diagnosis is not null)
                {
                    var nowLocked = DateTimeOffset.UtcNow;

                    var journeyLocked = user.JourneyState ?? new UserJourneyState
                    {
                        UserId = userId,
                        User = user,
                        ProgressJson = "{}",
                        CalendarJson = "{\"completedDays\":{}}",
                        UpdatedAt = nowLocked,
                    };

                    if (string.IsNullOrWhiteSpace(journeyLocked.AssignedTrack))
                    {
                        journeyLocked.AssignedTrack = user.Diagnosis.TrackId;
                    }

                    journeyLocked.JourneyStartDate ??= DateOnly.FromDateTime(DateTime.UtcNow);
                    journeyLocked.UpdatedAt = nowLocked;

                    if (user.JourneyState is null)
                    {
                        dbContext.UserJourneyStates.Add(journeyLocked);
                    }

                    user.UpdatedAt = nowLocked;

                    try
                    {
                        await dbContext.SaveChangesAsync(cancellationToken);
                    }
                    catch (DbUpdateException ex) when (attempt < ConcurrentStateSaveRetryCount - 1 && IsConcurrentStateInsertConflict(ex))
                    {
                        dbContext.ChangeTracker.Clear();
                        continue;
                    }

                    return Results.Ok(user.Diagnosis.ToDto());
                }

                var now = DateTimeOffset.UtcNow;
                var diagnosis = user.Diagnosis ?? new UserDiagnosis
                {
                    UserId = userId,
                    User = user,
                };

                diagnosis.TrackId = ApiMappers.Clean(request.TrackId);
                diagnosis.TrackLabel = ApiMappers.Clean(request.TrackLabel);
                diagnosis.ScoresJson = ApiMappers.Serialize(request.Scores, "{}");
                diagnosis.Diagnostico = ApiMappers.Clean(request.Diagnostico);
                diagnosis.Gatilho = ApiMappers.Clean(request.Gatilho);
                diagnosis.Sabedoria = ApiMappers.Clean(request.Sabedoria);
                diagnosis.Proverbio = ApiMappers.Clean(request.Proverbio);
                diagnosis.Metodo = ApiMappers.Clean(request.Metodo);
                diagnosis.AnsweredAt = ApiMappers.ParseDateTimeOffset(request.AnsweredAt) ?? now;
                diagnosis.UpdatedAt = now;

                if (user.Diagnosis is null)
                {
                    dbContext.UserDiagnoses.Add(diagnosis);
                }

                var journeyState = user.JourneyState ?? new UserJourneyState
                {
                    UserId = userId,
                    User = user,
                    ProgressJson = "{}",
                    CalendarJson = "{\"completedDays\":{}}",
                    UpdatedAt = now,
                };

                journeyState.AssignedTrack = diagnosis.TrackId;
                journeyState.JourneyStartDate ??= DateOnly.FromDateTime(DateTime.UtcNow);
                journeyState.UpdatedAt = now;

                if (user.JourneyState is null)
                {
                    dbContext.UserJourneyStates.Add(journeyState);
                }

                user.HasCompletedAssessment = true;

                user.UpdatedAt = now;

                try
                {
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException ex) when (attempt < ConcurrentStateSaveRetryCount - 1 && IsConcurrentStateInsertConflict(ex))
                {
                    dbContext.ChangeTracker.Clear();
                    continue;
                }

                return Results.Ok(diagnosis.ToDto());
            }

            return Results.Problem("Could not save diagnosis because concurrent state updates kept conflicting.");
        });

        group.MapPut("/{userId:guid}/journey", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            JourneyStateUpsertRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            for (var attempt = 0; attempt < ConcurrentStateSaveRetryCount; attempt++)
            {
                var user = await dbContext.Users
                    .Include(x => x.JourneyState)
                    .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

                if (user is null)
                {
                    return Results.NotFound();
                }

                var journeyState = user.JourneyState ?? new UserJourneyState
                {
                    UserId = userId,
                    User = user,
                };

                journeyState.AssignedTrack = string.IsNullOrWhiteSpace(request.AssignedTrack)
                    ? journeyState.AssignedTrack
                    : ApiMappers.Clean(request.AssignedTrack);

                journeyState.JourneyStartDate = ApiMappers.ParseDateOnly(request.JourneyStartDate) ?? journeyState.JourneyStartDate;
                journeyState.ProgressJson = ApiMappers.Serialize(request.Progress, "{}");
                journeyState.CalendarJson = ApiMappers.Serialize(request.Calendar, "{\"completedDays\":{}}");
                journeyState.UpdatedAt = DateTimeOffset.UtcNow;

                if (user.JourneyState is null)
                {
                    dbContext.UserJourneyStates.Add(journeyState);
                }

                user.UpdatedAt = DateTimeOffset.UtcNow;

                try
                {
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException ex) when (attempt < ConcurrentStateSaveRetryCount - 1 && IsConcurrentStateInsertConflict(ex))
                {
                    dbContext.ChangeTracker.Clear();
                    continue;
                }

                return Results.Ok(journeyState.ToDto());
            }

            return Results.Problem("Could not save journey state because concurrent state updates kept conflicting.");
        });

        group.MapPut("/{userId:guid}/lessons/progress/{lessonId}", async (
            Guid userId,
            string lessonId,
            ClaimsPrincipal userPrincipal,
            LessonProgressUpsertRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var userExists = await dbContext.Users.AnyAsync(x => x.Id == userId, cancellationToken);

            if (!userExists)
            {
                return Results.NotFound();
            }

            var normalizedLessonId = ApiMappers.Clean(lessonId);
            var progress = await dbContext.UserLessonProgressEntries
                .SingleOrDefaultAsync(x => x.UserId == userId && x.LessonId == normalizedLessonId, cancellationToken);

            if (progress is null)
            {
                progress = new UserLessonProgress
                {
                    UserId = userId,
                    LessonId = normalizedLessonId,
                };

                dbContext.UserLessonProgressEntries.Add(progress);
            }

            progress.Completed = request.Completed;
            progress.UpdatedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(progress.ToDto());
        });

        group.MapGet("/{userId:guid}/mentor/messages", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var userExists = await dbContext.Users.AnyAsync(x => x.Id == userId, cancellationToken);

            if (!userExists)
            {
                return Results.NotFound();
            }

            var messages = await dbContext.MentorChatMessages
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return Results.Ok(messages.Select(x => x.ToDto()));
        });

        group.MapDelete("/{userId:guid}/mentor/messages", async (
            Guid userId,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            if (userPrincipal.GetRequiredUserId() != userId)
            {
                return Results.Forbid();
            }

            var messages = await dbContext.MentorChatMessages
                .Where(x => x.UserId == userId)
                .ToListAsync(cancellationToken);

            if (messages.Count == 0)
            {
                return Results.NoContent();
            }

            dbContext.MentorChatMessages.RemoveRange(messages);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.NoContent();
        });

        return app;
    }

    private static void ClearMarketingAttribution(AppUser user)
    {
        user.UtmSource = null;
        user.UtmMedium = null;
        user.UtmCampaign = null;
        user.UtmTerm = null;
        user.UtmContent = null;
    }

    private static void AnonymizeUser(AppUser user)
    {
        var now = DateTimeOffset.UtcNow;

        user.Email = $"deleted-{user.Id:N}@privacy.local";
        user.Name = "Deleted account";
        user.PasswordHash = string.Empty;
        user.PasswordResetTokenHash = string.Empty;
        user.PasswordResetTokenExpiresAt = null;
        user.HasCompletedAssessment = false;
        user.AccessEnabled = false;
        user.AccountCreatedEmailSentAt = null;
        user.AccessGrantedAt = null;
        user.AccessEmailSentAt = null;
        user.PlanName = string.Empty;
        user.PlanStatus = "Account deleted";
        user.NextChargeDate = null;
        user.StripeCustomerId = string.Empty;
        user.StripeSubscriptionId = string.Empty;
        user.LastStripeCheckoutSessionId = string.Empty;
        user.HasUsedRenewalOffer = false;
        user.UpdatedAt = now;
        ClearMarketingAttribution(user);
    }

    private static async Task RemoveUserPersonalStateAsync(
        AppDbContext dbContext,
        Guid userId,
        CancellationToken cancellationToken)
    {
        dbContext.AppSessions.RemoveRange(await dbContext.AppSessions
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.PasswordResetTokens.RemoveRange(await dbContext.PasswordResetTokens
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.UserDiagnoses.RemoveRange(await dbContext.UserDiagnoses
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.UserJourneyStates.RemoveRange(await dbContext.UserJourneyStates
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.UserLessonProgressEntries.RemoveRange(await dbContext.UserLessonProgressEntries
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.MentorChatMessages.RemoveRange(await dbContext.MentorChatMessages
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.MentorDailyFeedbacks.RemoveRange(await dbContext.MentorDailyFeedbacks
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.MentorFinalReports.RemoveRange(await dbContext.MentorFinalReports
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
        dbContext.MentorUsages.RemoveRange(await dbContext.MentorUsages
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken));
    }

    private static bool IsConcurrentStateInsertConflict(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "PK_user_diagnoses" or "PK_user_journey_states"
        };
    }
}
