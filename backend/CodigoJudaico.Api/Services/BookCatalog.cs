namespace CodigoJudaico.Api.Services;

public sealed record BookDefinition(
    string Id,
    string Title,
    string Description,
    string PriceLabel,
    string CoverImageFileName,
    string PdfFileName,
    bool IsAccessBonus = false);

public static class BookCatalog
{
    public static readonly IReadOnlyList<BookDefinition> All =
    [
        new BookDefinition(
            "identidade-nome-dinheiro",
            "Identidade, Nome e Dinheiro",
            "Descubra como sua identidade financeira foi moldada e como reconectar seu nome ao dinheiro segundo a sabedoria judaica.",
            "R$ 9,90",
            "identidade-nome-dinheiro.png",
            "identidade-nome-dinheiro.pdf"),
        new BookDefinition(
            "metodo-judaico-riqueza",
            "O Método Judaico da Riqueza",
            "O método completo de prosperidade judaica: princípios ancestrais para construir riqueza de forma sustentável.",
            "R$ 17,90",
            "metodo-judaico-riqueza.png",
            "metodo-judaico-riqueza.pdf"),
        new BookDefinition(
            "prosperidade-geracoes",
            "Prosperidade ao Longo das Gerações",
            "Como construir um legado financeiro que atravessa gerações, baseado nos ensinamentos do Talmude.",
            "R$ 9,90",
            "prosperidade-geracoes.png",
            "prosperidade-geracoes.pdf"),
        new BookDefinition(
            "7-gatilhos-dinheiro-escapar",
            "Os 7 Gatilhos Invisíveis que Fazem Seu Dinheiro Escapar",
            "Bônus exclusivo para alunos com acesso ao site: identifique os impulsos ocultos que drenam seu dinheiro antes que eles conduzam suas decisões.",
            "Bônus",
            string.Empty,
            "Os-7-Gatilhos-Invisiveis-que-Fazem-Seu-Dinheiro-Escapar.pdf",
            IsAccessBonus: true),
        new BookDefinition(
            "7-gatilhos-dinheiro-desaparecer",
            "Os 7 Gatilhos Invisíveis que Fazem Seu Dinheiro Desaparecer",
            "Bônus exclusivo para alunos com acesso ao site: aprofunde os padrões emocionais que fazem o dinheiro sumir no automático.",
            "Bônus",
            string.Empty,
            "Os-7-Gatilhos-Invisiveis-que-Fazem-Seu-Dinheiro-Desaparecer.pdf",
            IsAccessBonus: true),
    ];

    public static BookDefinition? FindById(string? id) =>
        All.FirstOrDefault(b => string.Equals(b.Id, id?.Trim(), StringComparison.OrdinalIgnoreCase));
}
