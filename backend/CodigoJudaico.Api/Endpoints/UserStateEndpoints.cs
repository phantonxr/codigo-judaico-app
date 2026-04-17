using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class UserStateEndpoints
{
    public static IEndpointRouteBuilder MapUserStateEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users").RequireAuthorization();

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

            var user = await dbContext.Users
                .Include(x => x.Diagnosis)
                .Include(x => x.JourneyState)
                .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound();
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

            user.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(diagnosis.ToDto());
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
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(journeyState.ToDto());
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
}
