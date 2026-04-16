namespace CodigoJudaico.Api.Services;

public sealed class MentorFallbackService
{
    private static readonly string[] MacroLessons =
    [
        "Hoje voce avancou um passo concreto na construcao patrimonial. Cada acao diaria acumula e compoe seu futuro financeiro.",
        "Sua disciplina neste programa macro esta consolidando base, clareza e resistencia emocional.",
        "O pilar trabalhado hoje fortalece toda sua estrutura financeira. Cada pequena entrega conta."
    ];

    private static readonly string[] Blindspots =
    [
        "Observe se ha resistencia emocional em olhar os numeros. Consciencia vem antes de crescimento.",
        "Atente-se para gastos de compensacao emocional quando o estresse aumenta.",
        "Perceba se voce esta delegando demais suas financas em vez de assumir protagonismo."
    ];

    private static readonly string[] Wisdoms =
    [
        "Na tradicao judaica, disciplina e bondade caminham juntas: limite com amor e generosidade com proposito.",
        "O sabio constroi primeiro a base e so depois amplia a casa. Ordem protege a prosperidade.",
        "Prosperidade sustentavel nasce de constancia, prudencia e responsabilidade."
    ];

    private static readonly string[] Proverbs =
    [
        "\"Planos bem pensados levam a prosperidade.\" — Proverbios 21:5",
        "\"Quem governa seus impulsos e mais forte do que quem conquista cidades.\" — Pirkei Avot 4:1",
        "\"Primeiro prepare o campo, depois construa a casa.\" — Proverbios 24:27"
    ];

    private static readonly string[] NextFocuses =
    [
        "Amanha, antes de qualquer gasto, pare por 90 segundos e pergunte se isso fortalece sua meta.",
        "No proximo dia, observe um gatilho com curiosidade em vez de reagir imediatamente.",
        "Escolha uma area financeira para melhorar 1% amanha. Pequenas melhorias acumulam."
    ];

    private static readonly string[] ExtraTasks =
    [
        "Exercicio de pausa de 24h: toda compra nao planejada espera um dia inteiro.",
        "Revise uma crenca familiar sobre dinheiro e reescreva-a em linguagem de responsabilidade.",
        "Cancele um gasto gatilho identificado esta semana.",
        "Aumente seu aporte automatico em 5% neste mes."
    ];

    public string BuildMentorReply(string message, string? currentPlan)
    {
        var text = (message ?? string.Empty).Trim().ToLowerInvariant();
        const string style = "Vamos com equilibrio: riqueza como ferramenta, consciencia no gasto e paz na mente.";

        if (text.Contains("compuls") || text.Contains("compr"))
        {
            return
                $"Obrigado por sua honestidade. {style}\n\n" +
                "Hoje observe o gatilho principal e escreva uma frase simples: o que eu estou tentando aliviar agora?\n\n" +
                "Micro-acao: escolha uma compra para adiar por 24 horas.";
        }

        if (text.Contains("invest"))
        {
            return
                $"Investir e constancia, nao pressa. {style}\n\n" +
                "Comece pelo basico: reserva, seguranca e so entao crescimento.\n\n" +
                "Micro-acao: defina um valor mensal fixo, mesmo pequeno, e uma data para automatizar.";
        }

        if (text.Contains("organ") || text.Contains("gasto"))
        {
            return
                $"Clareza precede prosperidade. {style}\n\n" +
                "Hoje faca um inventario simples: tres gastos fixos, tres variaveis e um automatico invisivel.\n\n" +
                "Micro-acao: escolha um gasto automatico para reduzir em 10% por sete dias.";
        }

        var planSuffix = string.IsNullOrWhiteSpace(currentPlan) ? string.Empty : $" (plano: {currentPlan})";

        return
            $"{style}{planSuffix}\n\n" +
            "Para eu te orientar com mais precisao: qual e sua meta financeira para os proximos 30 dias, em um numero?\n\n" +
            "Micro-acao: escreva agora um gasto que voce vai observar hoje sem se julgar.";
    }

    public DailyFeedbackPayload BuildDailyFeedback(int currentDay)
    {
        var random = Random.Shared;
        var isMacro = currentDay >= 21;

        if (isMacro)
        {
            return new DailyFeedbackPayload(
                Summary: string.Empty,
                Correction: string.Empty,
                MacroLesson: MacroLessons[random.Next(MacroLessons.Length)],
                Blindspot: Blindspots[random.Next(Blindspots.Length)],
                JewishWisdom: Wisdoms[random.Next(Wisdoms.Length)],
                Proverb: Proverbs[random.Next(Proverbs.Length)],
                NextFocus: NextFocuses[random.Next(NextFocuses.Length)],
                ExtraTask: ExtraTasks[random.Next(ExtraTasks.Length)],
                TomorrowFocus: NextFocuses[random.Next(NextFocuses.Length)]);
        }

        return new DailyFeedbackPayload(
            Summary: "Voce demonstrou disposicao para enxergar seus padroes e agir com mais consciencia financeira.",
            Correction: "No proximo passo, observe o momento em que o gatilho aparece e responda com pausa em vez de impulso.",
            MacroLesson: string.Empty,
            Blindspot: string.Empty,
            JewishWisdom: Wisdoms[random.Next(Wisdoms.Length)],
            Proverb: Proverbs[random.Next(Proverbs.Length)],
            NextFocus: NextFocuses[random.Next(NextFocuses.Length)],
            ExtraTask: null,
            TomorrowFocus: string.Empty);
    }
}

public sealed record DailyFeedbackPayload(
    string Summary,
    string Correction,
    string MacroLesson,
    string Blindspot,
    string JewishWisdom,
    string Proverb,
    string NextFocus,
    string? ExtraTask,
    string TomorrowFocus);
