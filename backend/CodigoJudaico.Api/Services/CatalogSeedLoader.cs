using System.Text.Json;

namespace CodigoJudaico.Api.Services;

public sealed class CatalogSeedLoader(IWebHostEnvironment environment)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<CatalogSeedSet> LoadAsync(CancellationToken cancellationToken = default)
    {
        var basePath = Path.Combine(environment.ContentRootPath, "SeedData");

        return new CatalogSeedSet(
            await ReadAsync<List<LessonSeed>>(Path.Combine(basePath, "lessons.json"), cancellationToken) ?? [],
            await ReadAsync<List<PlanSeed>>(Path.Combine(basePath, "plans.json"), cancellationToken) ?? [],
            await ReadAsync<List<OfferSeed>>(Path.Combine(basePath, "offers.json"), cancellationToken) ?? [],
            await ReadAsync<List<WisdomSeed>>(Path.Combine(basePath, "wisdom.json"), cancellationToken) ?? []);
    }

    private static async Task<T?> ReadAsync<T>(string path, CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
        {
            return default;
        }

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken);
    }
}

public sealed record CatalogSeedSet(
    IReadOnlyList<LessonSeed> Lessons,
    IReadOnlyList<PlanSeed> Plans,
    IReadOnlyList<OfferSeed> Offers,
    IReadOnlyList<WisdomSeed> WisdomSnippets);

public sealed record LessonSeed(
    string Id,
    string Title,
    string Category,
    string Duration,
    string Teaching,
    string Proverb,
    string Practical,
    string Reflection,
    string VideoUrl,
    string Summary);

public sealed record PlanSeed(
    string Id,
    string Name,
    string Price,
    string Period,
    bool Highlighted,
    IReadOnlyList<string> Features);

public sealed record OfferSeed(
    string Id,
    string Title,
    string Description,
    string Price,
    string CtaLabel,
    string CtaHref);

public sealed record WisdomSeed(
    string Id,
    string Source,
    string Teaching);
