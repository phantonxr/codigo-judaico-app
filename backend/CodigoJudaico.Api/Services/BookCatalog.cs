namespace CodigoJudaico.Api.Services;

public sealed record BookDefinition(
    string Id,
    string Title,
    string Description,
    string PriceLabel,
    long PriceAmountInCents,
    string CoverImageFileName,
    string PdfFileName,
    bool IsVisibleInCatalog = true,
    bool IsAccessBonus = false);

public static class BookCatalog
{
    public const string MethodBookId = "metodo-judaico-riqueza";

    public static readonly IReadOnlyList<string> MethodBookLimitedTimeBonusBookIds =
    [
        "7-gatilhos-dinheiro-desaparecer",
        "7-gatilhos-dinheiro-escapar",
    ];

    public static readonly IReadOnlyList<BookDefinition> All =
    [
        new BookDefinition(
            MethodBookId,
            "O Método Judaico da Riqueza",
            "O método completo de prosperidade judaica: princípios ancestrais para construir riqueza de forma sustentável.",
            "R$ 17,90",
            1790,
            "metodo-judaico-riqueza.png",
            "metodo-judaico-riqueza.pdf"),
        new BookDefinition(
            "7-gatilhos-dinheiro-desaparecer",
            "Os 7 Gatilhos Invisíveis que Fazem Seu Dinheiro Desaparecer",
            "Aprofunde os padrões emocionais que fazem o dinheiro sumir no automático e aprenda a enxergar o gatilho antes da decisão.",
            "R$ 9,90",
            990,
            "7-gatilhos-dinheiro-desaparecer.png",
            "Os-7-Gatilhos-Invisiveis-que-Fazem-Seu-Dinheiro-Desaparecer.pdf",
            IsVisibleInCatalog: false),
        new BookDefinition(
            "7-gatilhos-dinheiro-escapar",
            "Os 7 Gatilhos Invisíveis que Fazem Seu Dinheiro Escapar",
            "Identifique os impulsos ocultos que drenam seu dinheiro antes que eles conduzam suas decisões financeiras.",
            "R$ 9,90",
            990,
            "7-gatilhos-dinheiro-escapar.png",
            "Os-7-Gatilhos-Invisiveis-que-Fazem-Seu-Dinheiro-Escapar.pdf",
            IsVisibleInCatalog: false),
        new BookDefinition(
            "identidade-nome-dinheiro",
            "Identidade, Nome e Dinheiro",
            "Descubra como sua identidade financeira foi moldada e como reconectar seu nome ao dinheiro segundo a sabedoria judaica.",
            "R$ 9,90",
            990,
            "identidade-nome-dinheiro.png",
            "identidade-nome-dinheiro.pdf"),
        new BookDefinition(
            "prosperidade-geracoes",
            "Prosperidade ao Longo das Gerações",
            "Como construir um legado financeiro que atravessa gerações, baseado nos ensinamentos do Talmude.",
            "R$ 9,90",
            990,
            "prosperidade-geracoes.png",
            "prosperidade-geracoes.pdf"),
    ];

    public static BookDefinition? FindById(string? id) =>
        All.FirstOrDefault(b => string.Equals(b.Id, id?.Trim(), StringComparison.OrdinalIgnoreCase));

    public static bool IsMethodBookLimitedTimeBonus(string? id) =>
        MethodBookLimitedTimeBonusBookIds.Contains(
            NormalizeId(id),
            StringComparer.OrdinalIgnoreCase);

    public static IReadOnlyList<string> ExpandWithPurchaseBonuses(IEnumerable<string>? bookIds)
    {
        if (bookIds is null)
        {
            return [];
        }

        var result = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var hasMethodBook = false;

        foreach (var rawBookId in bookIds)
        {
            var bookId = NormalizeId(rawBookId);

            if (string.IsNullOrWhiteSpace(bookId))
            {
                continue;
            }

            if (seen.Add(bookId))
            {
                result.Add(bookId);
            }

            hasMethodBook = hasMethodBook
                || string.Equals(bookId, MethodBookId, StringComparison.OrdinalIgnoreCase);
        }

        if (!hasMethodBook)
        {
            return result;
        }

        foreach (var bonusBookId in MethodBookLimitedTimeBonusBookIds)
        {
            if (seen.Add(bonusBookId))
            {
                result.Add(bonusBookId);
            }
        }

        return result;
    }

    private static string NormalizeId(string? id) =>
        string.IsNullOrWhiteSpace(id)
            ? string.Empty
            : id.Trim().ToLowerInvariant();
}
