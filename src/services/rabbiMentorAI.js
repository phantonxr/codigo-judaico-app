import { apiFetch } from './apiClient.js'
import { SEDER_HAKESEF_PROMPT_BLOCK } from '../constants/sederHakesefKnowledge.js'

/**
 * Servico de feedback diario do Rabino Mentor IA.
 * Integracao real com OpenAI via backend.
 * Fallback offline para demonstracao.
 *
 * Formato macro (6 meses):
 * { macroLesson, blindspot, jewishWisdom, proverb, extraTask, tomorrowFocus }
 *
 * Formato 21 dias (legado):
 * { summary, correction, jewishWisdom, proverb, nextFocus }
 */

function safeTrim(text) {
  return String(text ?? '').trim()
}

// -- Prompt for 21-day phase --

var DAILY_FEEDBACK_PROMPT = [
  'Voce eh um Rabino Mentor especialista em comportamento financeiro, psicologia do consumo, construcao de patrimonio e sabedoria judaica aplicada.',
  '',
  'Analise as tarefas concluidas, o relato emocional e os gatilhos do usuario.',
  'De um feedback profundo, humano e estrategico.',
  'Conecte com ensinamentos judaicos sobre prudencia, base solida, disciplina, legado, reserva e prosperidade.',
  'Finalize com um proverbio judaico poderoso e orientacao para o proximo dia.',
  '',
  'RESPONDA EXATAMENTE neste formato JSON (sem markdown, sem code block):',
  '{',
  '  "summary": "Resumo e analise do comportamento financeiro do dia (2-3 frases)",',
  '  "correction": "Correcao de rota e ajuste sugerido (2-3 frases)",',
  '  "jewishWisdom": "Conexao com ensinamento judaico especifico (2-3 frases)",',
  '  "proverb": "Proverbio judaico do dia com fonte",',
  '  "nextFocus": "Orientacao clara para o proximo dia (1-2 frases)"',
  '}',
].join('\n')

// -- Prompt for 6-month macro phase --

var MACRO_FEEDBACK_PROMPT = [
  'Voce eh um Rabino Mentor especialista em construcao patrimonial de longo prazo, behavioral finance, controle de impulsos, e sabedoria judaica aplicada a prosperidade.',
  '',
  'O usuario esta no programa macro de 6 meses de construcao patrimonial.',
  'Analise a tarefa macro concluida, o relato emocional e os gatilhos.',
  '',
  'Se detectar sinais de:',
  '- recaida emocional (compra por impulso, gasto de validacao)',
  '- fuga por ansiedade (evitar olhar as financas)',
  '- medo de crescimento (sabotar o proprio progresso)',
  '- crencas familiares limitantes (dinheiro eh sujo, rico eh desonesto)',
  '',
  'Sugira uma atividade extra complementar especifica.',
  '',
  'RESPONDA EXATAMENTE neste formato JSON (sem markdown, sem code block):',
  '{',
  '  "macroLesson": "Licao patrimonial do dia conectada ao pilar do mes (2-3 frases)",',
  '  "blindspot": "Ponto cego financeiro ou emocional detectado (2-3 frases)",',
  '  "jewishWisdom": "Conexao com ensinamento judaico sobre prosperidade sustentavel (2-3 frases)",',
  '  "proverb": "Proverbio judaico com fonte",',
  '  "extraTask": "Atividade extra opcional se detectou padrao negativo, ou null se tudo bem",',
  '  "tomorrowFocus": "Foco especifico para amanha (1-2 frases)"',
  '}',
].join('\n')

function buildDailyPrompt(payload) {
  var isMacro = payload.currentDay >= 21
  var prompt = isMacro ? MACRO_FEEDBACK_PROMPT : DAILY_FEEDBACK_PROMPT
  var parts = [SEDER_HAKESEF_PROMPT_BLOCK, '', prompt, '']

  if (payload.trailType) {
    parts.push('TRILHA DO USUARIO: ' + payload.trailType)
  }
  if (payload.currentDay !== undefined) {
    parts.push('DIA ATUAL: ' + (payload.currentDay + 1))
  }
  if (payload.dayTitle) {
    parts.push('TEMA DO DIA: ' + payload.dayTitle)
  }
  if (payload.monthTitle) {
    parts.push('MES ATUAL: ' + payload.monthTitle)
  }

  if (payload.completedTasks && payload.completedTasks.length) {
    parts.push('')
    parts.push('TAREFAS CONCLUIDAS:')
    payload.completedTasks.forEach(function (t) {
      parts.push('- ' + t)
    })
  }

  if (payload.reflection) {
    parts.push('')
    parts.push('O QUE O USUARIO FEZ HOJE: ' + payload.reflection)
  }

  if (payload.howFelt) {
    parts.push('COMO SE SENTIU: ' + payload.howFelt)
  }

  if (payload.emotionalTrigger) {
    parts.push('MAIOR GATILHO EMOCIONAL: ' + payload.emotionalTrigger)
  }

  if (payload.userFinancialProfile) {
    parts.push('')
    parts.push('PERFIL FINANCEIRO:')
    if (payload.userFinancialProfile.diagnosis) {
      parts.push('- Diagnostico: ' + payload.userFinancialProfile.diagnosis)
    }
    if (payload.userFinancialProfile.rootCause) {
      parts.push('- Causa raiz: ' + payload.userFinancialProfile.rootCause)
    }
  }

  return parts.join('\n')
}

function parseAIResponse(text) {
  try {
    var cleaned = safeTrim(text)
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    }
    var parsed = JSON.parse(cleaned)
    // Return whatever fields are present (supports both formats)
    return {
      summary: parsed.summary || '',
      correction: parsed.correction || '',
      macroLesson: parsed.macroLesson || '',
      blindspot: parsed.blindspot || '',
      jewishWisdom: parsed.jewishWisdom || '',
      proverb: parsed.proverb || '',
      nextFocus: parsed.nextFocus || parsed.tomorrowFocus || '',
      extraTask: parsed.extraTask || null,
      tomorrowFocus: parsed.tomorrowFocus || parsed.nextFocus || '',
    }
  } catch (e) {
    return {
      summary: safeTrim(text),
      correction: '',
      macroLesson: '',
      blindspot: '',
      jewishWisdom: '',
      proverb: '',
      nextFocus: '',
      extraTask: null,
      tomorrowFocus: '',
    }
  }
}

/**
 * Gera feedback diario real via OpenAI (backend).
 */
export async function generateDailyFeedback(payload) {
  var controller = new AbortController()
  var timeout = setTimeout(function () { controller.abort() }, 25000)

  try {
    // Prefer v2 endpoint (persists + returns structured fields)
    try {
      var dataV2 = await apiFetch('/api/mentor/daily-feedback', {
        method: 'POST',
        body: JSON.stringify({
          phase: payload.phase || (payload.currentDay >= 21 ? 'macro' : '21d'),
          dayNumber: Number(payload.currentDay ?? 0) + 1,
          completedTasks: payload.completedTasks || [],
          partialTasks: payload.partialTasks || [],
          notCompletedTasks: payload.notCompletedTasks || [],
          reflectionText: payload.reflection || '',
          emotionText: payload.howFelt || '',
          triggerText: payload.emotionalTrigger || '',
          currentTrack: payload.trailType || '',
        }),
        signal: controller.signal,
      })

      return {
        detectedTrigger: dataV2.detectedTrigger || '',
        emotionalPattern: dataV2.emotionalPattern || '',
        financialRisk: dataV2.financialRisk || '',
        jewishWisdom: dataV2.jewishWisdom || '',
        practicalAction: dataV2.practicalAction || '',
        feedbackText: dataV2.feedbackText || '',

        // Legacy-compatible fields used in existing UI
        summary: dataV2.feedbackText || '',
        correction: dataV2.financialRisk || '',
        proverb: '',
        nextFocus: dataV2.practicalAction || '',
      }
    } catch {
      // Fall back to legacy endpoint (does not persist)
    }

    var prompt = buildDailyPrompt(payload)

    var data = await apiFetch('/api/rabino-daily-feedback', {
      method: 'POST',
      body: JSON.stringify({
        systemPrompt: prompt,
        trailType: payload.trailType,
        currentDay: payload.currentDay,
        completedTasks: payload.completedTasks,
        reflection: payload.reflection,
        howFelt: payload.howFelt,
        emotionalTrigger: payload.emotionalTrigger,
      }),
      signal: controller.signal,
    })

    var reply = data.reply || data.message || data.output || ''

    if (!reply && !data.summary && !data.macroLesson) {
      throw new Error('Resposta vazia')
    }

    if (data.summary || data.macroLesson) {
      return {
        summary: data.summary || '',
        correction: data.correction || '',
        macroLesson: data.macroLesson || '',
        blindspot: data.blindspot || '',
        jewishWisdom: data.jewishWisdom || '',
        proverb: data.proverb || '',
        nextFocus: data.nextFocus || data.tomorrowFocus || '',
        extraTask: data.extraTask || null,
        tomorrowFocus: data.tomorrowFocus || data.nextFocus || '',
      }
    }

    return parseAIResponse(reply)
  } finally {
    clearTimeout(timeout)
  }
}

export async function getSavedDailyFeedback(params) {
  var phase = safeTrim(params?.phase)
  var dayNumber = Number(params?.dayNumber ?? 0)
  if (!phase || !dayNumber) throw new Error('Parametros invalidos')

  var dataV2 = await apiFetch(
    `/api/mentor/daily-feedback?phase=${encodeURIComponent(phase)}&dayNumber=${encodeURIComponent(String(dayNumber))}`,
  )

  return {
    detectedTrigger: dataV2.detectedTrigger || '',
    emotionalPattern: dataV2.emotionalPattern || '',
    financialRisk: dataV2.financialRisk || '',
    jewishWisdom: dataV2.jewishWisdom || '',
    practicalAction: dataV2.practicalAction || '',
    feedbackText: dataV2.feedbackText || '',

    summary: dataV2.feedbackText || '',
    correction: dataV2.financialRisk || '',
    proverb: '',
    nextFocus: dataV2.practicalAction || '',
  }
}

// -- Fallback offline --

var FALLBACK_SUMMARIES = {
  trilha1: [
    'Voce demonstrou coragem ao enfrentar seus impulsos financeiros hoje. Cada gasto consciente eh uma vitoria sobre o yetzer hara (inclinacao negativa). O fato de ter completado suas tarefas mostra que a disciplina esta se enraizando.',
    'Hoje voce deu um passo importante na transformacao dos seus habitos. Reconhecer gatilhos emocionais eh o primeiro passo para domina-los. O Talmud ensina que a verdadeira forca esta no autocontrole.',
    'Sua dedicacao ao processo de autoconhecimento financeiro eh admiravel. Cada impulso resistido fortalece seu carater. Lembre-se: a prosperidade judaica comeca com o dominio interno.',
  ],
  trilha2: [
    'Voce esta construindo algo solido hoje. A verdadeira riqueza nao se mede pelo que se mostra, mas pelo que se constroi em silencio. Seu compromisso com a fundacao patrimonial eh sabio.',
    'Cada acao de hoje fortalece seu alicerce financeiro. Status eh efemero; patrimonio eh eterno. O sabio constroi sobre a rocha, nao sobre a areia do ego.',
    'Sua disciplina em priorizar a base sobre a aparencia mostra maturidade financeira. A tradicao judaica valoriza a construcao paciente e a humildade no processo.',
  ],
  trilha3: [
    'Hoje voce enfrentou o medo com coragem. A paralisia financeira nao eh destino - eh um padrao que pode ser quebrado. Cada pequena acao de hoje prova que voce eh capaz de prosperar.',
    'Sua disposicao em agir apesar do medo eh a essencia da fe. Na tradicao judaica, bitachon (confianca) nao elimina o medo, mas nos move apesar dele.',
    'Voce esta provando que cautela e acao podem coexistir. A prudencia judaica nao eh paralisia - eh mover-se com sabedoria. Cada passo conta.',
  ],
}

var FALLBACK_MACRO_LESSONS = [
  'Hoje voce avancu um passo concreto na construcao patrimonial. Cada acao diaria acumula e compoe seu futuro financeiro. A tradicao judaica ensina: quem cuida do pouco, recebe mais.',
  'Sua disciplina neste programa macro eh impressionante. Voce esta fazendo o que 95% das pessoas nao fazem: agir sistematicamente. Isso gera resultados extraordinarios.',
  'O pilar trabalhado hoje fortalece toda sua estrutura financeira. Como o Templo de Jerusalem, cada pedra bem colocada sustenta as proximas.',
]

var FALLBACK_BLINDSPOTS = [
  'Observe se ha resistencia emocional em olhar os numeros. Muitos evitam confrontar a realidade financeira por medo. A consciencia eh o primeiro passo.',
  'Atente-se para gastos de compensacao emocional. Quando o estresse aumenta, o impulso de gastar pode crescer. Prepare-se antes do momento de fraqueza.',
  'Verifique se voce esta delegando suas financas para outra pessoa. Autonomia financeira exige envolvimento ativo e constante.',
]

var FALLBACK_CORRECTIONS = [
  'Para amanha, sugiro que voce dedique mais atencao ao momento em que o gatilho aparece. Nao julgue, apenas observe. A consciencia eh o primeiro passo da mudanca.',
  'Observe se ha um padrao de horario nos seus gatilhos. Preparar-se antes do momento de fraqueza eh mais eficaz do que reagir depois.',
  'Considere compartilhar seu progresso com alguem de confianca. A prestacao de contas multiplica a disciplina.',
]

var FALLBACK_WISDOM = [
  'O rabino Nachman de Breslov ensinava: "O mundo inteiro eh uma ponte muito estreita, e o principal eh nao ter medo." Suas financas sao essa ponte \u2014 atravesse com fe e disciplina.',
  'O Rambam (Maimonides) ensinava o caminho do meio: nem avareza nem desperdicio, mas equilibrio consciente. Sua jornada busca exatamente isso.',
  'Na cabala, Chessed (bondade) e Gevura (disciplina) devem estar em equilibrio. Suas financas precisam de ambas: generosidade com proposito e limite com amor.',
]

var FALLBACK_PROVERBS = [
  '"Quem governa seus impulsos eh mais forte do que quem conquista cidades." \u2014 Pirkei Avot 4:1',
  '"Planos bem pensados levam a prosperidade; a pressa leva a pobreza." \u2014 Proverbios 21:5',
  '"O sabio preve o perigo e se protege; o tolo segue adiante e sofre." \u2014 Proverbios 27:12',
  '"Quem se contenta com o que tem eh verdadeiramente rico." \u2014 Pirkei Avot 4:1',
  '"A paciencia eh a chave de toda alegria." \u2014 Talmud, Berakhot 54a',
  '"Primeiro prepare o campo, depois construa a casa." \u2014 Proverbios 24:27',
  '"O justo deixa heranca aos filhos de seus filhos." \u2014 Proverbios 13:22',
]

var FALLBACK_NEXT_FOCUS = [
  'Amanha, antes de qualquer gasto, pare por 90 segundos e pergunte: "Isso me aproxima ou me afasta da minha meta?"',
  'No proximo dia, inicie com gratidao: liste 3 bencaos financeiras que ja tem. A abundancia comeca com a percepcao.',
  'Amanha, escolha UMA area financeira para melhorar 1%. Pequenas melhoras diarias geram transformacao profunda.',
]

var FALLBACK_EXTRA_TASKS = [
  'Exercicio de pausa de 24h: antes de qualquer compra nao planejada, espere 24 horas.',
  'Revise 1 crenca familiar sobre dinheiro e reescreva de forma positiva.',
  'Cancele 1 gasto gatilho identificado esta semana.',
  'Aumente seu aporte automatico em 5% este mes.',
  'Registre por escrito seu maior medo sobre prosperar. Coloque no papel.',
  null,
  null,
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Gera feedback offline (fallback quando backend indisponivel).
 */
export function generateFallbackFeedback(payload) {
  var trail = payload.trailType || 'trilha1'
  var isMacro = payload.currentDay >= 21

  if (isMacro) {
    return {
      macroLesson: pick(FALLBACK_MACRO_LESSONS),
      blindspot: pick(FALLBACK_BLINDSPOTS),
      jewishWisdom: pick(FALLBACK_WISDOM),
      proverb: pick(FALLBACK_PROVERBS),
      extraTask: pick(FALLBACK_EXTRA_TASKS),
      tomorrowFocus: pick(FALLBACK_NEXT_FOCUS),
      summary: '',
      correction: '',
      nextFocus: '',
    }
  }

  var summaries = FALLBACK_SUMMARIES[trail] || FALLBACK_SUMMARIES.trilha1
  return {
    summary: pick(summaries),
    correction: pick(FALLBACK_CORRECTIONS),
    jewishWisdom: pick(FALLBACK_WISDOM),
    proverb: pick(FALLBACK_PROVERBS),
    nextFocus: pick(FALLBACK_NEXT_FOCUS),
    macroLesson: '',
    blindspot: '',
    extraTask: null,
    tomorrowFocus: '',
  }
}
