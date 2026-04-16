using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Endpoints;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").WithTags("Session");

        group.MapPost("/session", async (
            SessionRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var email = ApiMappers.NormalizeEmail(request.Email);

            if (string.IsNullOrWhiteSpace(email))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["O e-mail e obrigatorio para iniciar a sessao."]
                });
            }

            var now = DateTimeOffset.UtcNow;

            var user = await dbContext.Users
                .Include(x => x.Diagnosis)
                .Include(x => x.JourneyState)
                .Include(x => x.LessonProgressEntries)
                .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

            if (user is null)
            {
                user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    Name = string.IsNullOrWhiteSpace(request.Name) ? "Aluno" : ApiMappers.Clean(request.Name),
                    PlanName = ApiMappers.Clean(request.Plan),
                    PlanStatus = string.IsNullOrWhiteSpace(request.Plan) ? string.Empty : "Ativo",
                    CreatedAt = now,
                    UpdatedAt = now,
                };

                dbContext.Users.Add(user);
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.Name))
                {
                    user.Name = ApiMappers.Clean(request.Name);
                }

                if (!string.IsNullOrWhiteSpace(request.Plan))
                {
                    user.PlanName = ApiMappers.Clean(request.Plan);
                    user.PlanStatus = string.IsNullOrWhiteSpace(user.PlanStatus) ? "Ativo" : user.PlanStatus;
                }

                user.UpdatedAt = now;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            var mentorMessages = await dbContext.MentorChatMessages
                .Where(x => x.UserId == user.Id)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return Results.Ok(user.ToBootstrap(user.LessonProgressEntries, mentorMessages));
        })
        .WithName("StartSession");

        return app;
    }
}
