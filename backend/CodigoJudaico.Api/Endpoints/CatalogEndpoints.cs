using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog").WithTags("Catalog");

        group.MapGet("/lessons", async (AppDbContext dbContext, CancellationToken cancellationToken) =>
        {
            var lessons = await dbContext.Lessons
                .OrderBy(x => x.SortOrder)
                .ToListAsync(cancellationToken);

            return Results.Ok(lessons.Select(x => x.ToDto()));
        });

        group.MapGet("/plans", async (AppDbContext dbContext, CancellationToken cancellationToken) =>
        {
            var plans = await dbContext.Plans
                .OrderBy(x => x.SortOrder)
                .ToListAsync(cancellationToken);

            return Results.Ok(plans.Select(x => x.ToDto()));
        });

        group.MapGet("/offers", async (AppDbContext dbContext, CancellationToken cancellationToken) =>
        {
            var offers = await dbContext.Offers
                .OrderBy(x => x.SortOrder)
                .ToListAsync(cancellationToken);

            return Results.Ok(offers.Select(x => x.ToDto()));
        });

        group.MapGet("/wisdom/daily", async (AppDbContext dbContext, DateOnly? date, CancellationToken cancellationToken) =>
        {
            var snippets = await dbContext.WisdomSnippets
                .OrderBy(x => x.SortOrder)
                .ToListAsync(cancellationToken);

            if (snippets.Count == 0)
            {
                return Results.NotFound();
            }

            var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var index = Math.Abs(targetDate.DayNumber) % snippets.Count;

            return Results.Ok(snippets[index].ToDto());
        });

        return app;
    }
}
