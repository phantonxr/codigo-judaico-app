using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CodigoJudaico.Api.Data;

public sealed class AppDbInitializer(
    AppDbContext dbContext,
    CatalogSeedLoader catalogSeedLoader,
    PasswordHashService passwordHashService,
    IConfiguration configuration,
    ILogger<AppDbInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        await EnsureConfiguredMasterUserAsync(cancellationToken);

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

    private async Task EnsureConfiguredMasterUserAsync(CancellationToken cancellationToken)
    {
        var email = ApiMappers.NormalizeEmail(configuration["MasterUser:Email"]);
        var password = (configuration["MasterUser:Password"] ?? string.Empty).Trim();
        var name = (configuration["MasterUser:Name"] ?? "Master").Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        if (password.Length < 8)
        {
            logger.LogWarning(
                "MasterUser configurado para {Email}, mas a senha tem menos de 8 caracteres. O usuario master nao foi criado.",
                email);
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user is null)
        {
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = string.IsNullOrWhiteSpace(name) ? "Master" : name,
                CreatedAt = now,
            };

            dbContext.Users.Add(user);
        }
        else if (!string.IsNullOrWhiteSpace(name))
        {
            user.Name = name;
        }

        user.IsMasterUser = true;
        user.PasswordHash = passwordHashService.HashPassword(password);
        user.PlanName = string.IsNullOrWhiteSpace(user.PlanName) ? "Master" : user.PlanName;
        user.PlanStatus = string.IsNullOrWhiteSpace(user.PlanStatus) ? "Acesso master" : user.PlanStatus;
        user.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Usuario master configurado para {Email}.", email);
    }
}
