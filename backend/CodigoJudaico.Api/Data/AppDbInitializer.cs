using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CodigoJudaico.Api.Data;

public sealed class AppDbInitializer(
    AppDbContext dbContext,
    CatalogSeedLoader catalogSeedLoader,
    ILogger<AppDbInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        if (await dbContext.Lessons.AnyAsync(cancellationToken))
        {
            return;
        }

        var seed = await catalogSeedLoader.LoadAsync(cancellationToken);

        dbContext.Lessons.AddRange(seed.Lessons.Select((item, index) => new Lesson
        {
            Id = item.Id,
            SortOrder = index,
            Title = item.Title,
            Category = item.Category,
            Duration = item.Duration,
            Teaching = item.Teaching,
            Proverb = item.Proverb,
            Practical = item.Practical,
            Reflection = item.Reflection,
            VideoUrl = item.VideoUrl,
            Summary = item.Summary,
        }));

        dbContext.Plans.AddRange(seed.Plans.Select((item, index) => new Plan
        {
            Id = item.Id,
            SortOrder = index,
            Name = item.Name,
            Price = item.Price,
            Period = item.Period,
            Highlighted = item.Highlighted,
            FeaturesJson = JsonSerializer.Serialize(item.Features),
        }));

        dbContext.Offers.AddRange(seed.Offers.Select((item, index) => new Offer
        {
            Id = item.Id,
            SortOrder = index,
            Title = item.Title,
            Description = item.Description,
            Price = item.Price,
            CtaLabel = item.CtaLabel,
            CtaHref = item.CtaHref,
        }));

        dbContext.WisdomSnippets.AddRange(seed.WisdomSnippets.Select((item, index) => new WisdomSnippet
        {
            Id = item.Id,
            SortOrder = index,
            Source = item.Source,
            Teaching = item.Teaching,
        }));

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Seed inicial aplicado: {Lessons} aulas, {Plans} planos, {Offers} ofertas e {Wisdom} sabedorias.",
            seed.Lessons.Count,
            seed.Plans.Count,
            seed.Offers.Count,
            seed.WisdomSnippets.Count);
    }
}
