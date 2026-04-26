import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, Sparkles, Target } from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import { apiFetch } from '../services/apiClient.js'
import {
  get21DayProgress,
  getDayData,
  getDayTaskStatuses,
  getDayStatusSummary,
} from '../hooks/useJourneyProgress.js'

function normalizeText(value) {
  var v = String(value || '').trim()
  if (!v) return ''
  try {
    return v
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  } catch {
    return v.toLowerCase()
  }
}

function pickDominantTrigger(report) {
  var g = String(report?.gatilhoPrincipal || '').trim()
  if (g) return g
  var top0 = report?.topTriggers?.[0]
  if (top0) return String(top0).trim()
  return 'gatilho emocional'
}

function buildTriggerTendencyDescription(dominantTrigger, report) {
  var dominantN = normalizeText(dominantTrigger)

  if (dominantN.includes('ansied')) {
    return 'Você tende a gastar para aliviar ansiedade e buscar sensação imediata de controle.'
  }

  if (dominantN.includes('compar') || dominantN.includes('status') || dominantN.includes('valid')) {
    return 'Você tende a gastar quando se compara, buscando validação e alívio emocional rápido.'
  }

  if (dominantN.includes('recomp') || dominantN.includes('prazer') || dominantN.includes('imediat')) {
    return 'Você tende a gastar em busca de recompensa imediata quando a emoção sobe.'
  }

  var emotionalPattern = String(report?.emotionalPattern || report?.emotionalPattern || '').trim()
  if (emotionalPattern && emotionalPattern.length <= 120) {
    return 'Você tende a gastar quando ' + emotionalPattern.replace(/\.$/, '') + '.'
  }

  return 'Você tende a gastar quando a decisão acontece no piloto automático — para aliviar a emoção do momento.'
}

function inferSituationEmotion(dominantTrigger, report) {
  var t = normalizeText(dominantTrigger)
  var ep = normalizeText(report?.emotionalPattern)
  var source = t + ' ' + ep

  if (source.includes('ansied')) return 'sente ansiedade'
  if (source.includes('estress') || source.includes('press')) return 'fica sob pressão'
  if (source.includes('frustra') || source.includes('raiva') || source.includes('irrit')) return 'fica frustrado'
  if (source.includes('tedio') || source.includes('entedi')) return 'sente tédio'
  if (source.includes('carenc') || source.includes('vazio')) return 'sente carência'

  return 'a emoção sobe'
}

function inferRecurringPattern(dominantTrigger, report) {
  var t = normalizeText(dominantTrigger)
  var ep = normalizeText(report?.emotionalPattern)
  var source = t + ' ' + ep

  if (source.includes('recomp') || source.includes('prazer') || source.includes('imediat') || source.includes('aliv')) {
    return 'busca alívio imediato'
  }
  if (source.includes('compar') || source.includes('status') || source.includes('valid')) {
    return 'busca validação'
  }
  if (source.includes('escasse') || source.includes('oportun') || source.includes('perder')) {
    return 'cai na urgência'
  }

  return 'repete o mesmo ciclo'
}

function inferAutomaticBehavior(dominantTrigger) {
  var t = normalizeText(dominantTrigger)
  if (t.includes('descontrol') || t.includes('impuls')) return 'compra por impulso'
  return 'decide no automático'
}

function buildPatternsList(dominantTrigger) {
  var dominantN = normalizeText(dominantTrigger)
  var items = []

  items.push({
    id: 'impulso_emocional',
    label: 'Gastos por impulso emocional',
    icon: Sparkles,
  })

  if (dominantN.includes('recomp') || dominantN.includes('prazer') || dominantN.includes('imediat')) {
    items.push({ id: 'recompensa', label: 'Busca por recompensa imediata', icon: CheckCircle2 })
  }

  items.push({
    id: 'consciencia',
    label: 'Falta de consciência no momento da decisão',
    icon: Eye,
  })

  if (items.length < 3) {
    items.push({ id: 'recompensa', label: 'Busca por recompensa imediata', icon: CheckCircle2 })
  }

  return items.slice(0, 3)
}

function computeRecordsStats(payload, dominantTrigger) {
  if (!payload) return null

  var triggers = Array.isArray(payload.triggers) ? payload.triggers : []
  var triggerTexts = triggers
    .map(function (x) { return String(x?.trigger || '').trim() })
    .filter(Boolean)

  var daysWithImpulseSignal = triggerTexts.length

  var dominantN = normalizeText(dominantTrigger)
  var dominantKey = dominantN.split(/\s+/).filter(Boolean)[0] || dominantN

  var repeatedMoments = dominantKey
    ? triggerTexts.filter(function (t) { return normalizeText(t).includes(dominantKey) }).length
    : 0

  var ctxCounts = { pressao: 0, cansaco: 0, redes: 0, promocoes: 0, familia: 0 }
  for (var i = 0; i < triggerTexts.length; i++) {
    var t = normalizeText(triggerTexts[i])
    if (t.includes('trabalho') || t.includes('prazo') || t.includes('press')) ctxCounts.pressao++
    if (t.includes('cans') || t.includes('noite') || t.includes('sono')) ctxCounts.cansaco++
    if (t.includes('instagram') || t.includes('rede') || t.includes('social') || t.includes('compar')) ctxCounts.redes++
    if (t.includes('promo') || t.includes('so hoje') || t.includes('urgenc') || t.includes('ultima')) ctxCounts.promocoes++
    if (t.includes('famil') || t.includes('filh') || t.includes('marid') || t.includes('espos')) ctxCounts.familia++
  }

  var context = 'momentos de emoção intensa'
  var best = { k: 'none', v: 0 }
  var keys = Object.keys(ctxCounts)
  for (var j = 0; j < keys.length; j++) {
    var k = keys[j]
    if (ctxCounts[k] > best.v) best = { k: k, v: ctxCounts[k] }
  }

  if (best.v > 0) {
    context = best.k === 'pressao'
      ? 'pressão e prazos'
      : best.k === 'cansaco'
        ? 'cansaço e fim do dia'
        : best.k === 'redes'
          ? 'comparação e redes sociais'
          : best.k === 'promocoes'
            ? 'promoções e sensação de urgência'
            : 'situações familiares'
  }

  var progress = Array.isArray(payload.allDaysProgress) ? payload.allDaysProgress : []
  var attemptedControlDays = progress.filter(function (d) {
    var s = String(d?.statusSummary || '')
    return s === 'partial' || s === 'sent_ai'
  }).length

  return {
    daysWithImpulseSignal: daysWithImpulseSignal,
    repeatedMoments: repeatedMoments,
    context: context,
    attemptedControlDays: attemptedControlDays,
  }
}

function buildFinalReportPayload() {
  const days = Array.from({ length: 21 }, (_, i) => i)

  const allDaysProgress = days.map((dayIndex) => ({
    dayNumber: dayIndex + 1,
    statusSummary: getDayStatusSummary(dayIndex),
    taskStatuses: getDayTaskStatuses(dayIndex),
  }))

  const dailyFeedbacks = days
    .map((dayIndex) => ({ dayNumber: dayIndex + 1, feedback: getDayData(dayIndex)?.aiFeedback || null }))
    .filter((x) => x.feedback)

  const reflections = days.map((dayIndex) => ({
    dayNumber: dayIndex + 1,
    whatIDid: getDayData(dayIndex)?.whatIDid || '',
    howIFelt: getDayData(dayIndex)?.howIFelt || '',
  }))

  const triggers = days.map((dayIndex) => ({
    dayNumber: dayIndex + 1,
    trigger: getDayData(dayIndex)?.trigger || '',
  }))

  const emotions = days.map((dayIndex) => ({
    dayNumber: dayIndex + 1,
    emotion: getDayData(dayIndex)?.howIFelt || '',
  }))

  return {
    allDaysProgress,
    dailyFeedbacks,
    reflections,
    triggers,
    emotions,
  }
}

export default function RelatorioFinal() {
  const p21 = get21DayProgress()
  const isEligible = p21.completed >= 21

  const payload = useMemo(() => (isEligible ? buildFinalReportPayload() : null), [isEligible])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)

  useEffect(() => {
    if (!payload) return

    setLoading(true)
    setError('')

    apiFetch('/api/mentor/final-report', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then((data) => setReport(data))
      .catch(() => setError('Não consegui gerar seu relatório agora. Tente novamente em instantes.'))
      .finally(() => setLoading(false))
  }, [payload])

  if (!isEligible) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 12 }}>
        <SectionCard
          title="Relatório Rabínico da Sua Jornada Financeira"
          description="Conclua os 21 dias para liberar seu relatório final personalizado com padrões, gatilhos e a virada para a próxima trilha."
        >
          <Link className="btn btn-primary" to="/desafios">
            Ir para os Desafios
          </Link>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 12, paddingBottom: 90 }}>
      <SectionCard
        title=""
        description=""
      >
        {loading ? (
          <div className="card" style={{ padding: 12 }}>
            <div className="muted">Gerando seu relatório…</div>
          </div>
        ) : null}

        {error ? (
          <div className="card" style={{ padding: 12, borderColor: 'rgba(240,156,74,0.35)' }}>
            <div className="muted">{error}</div>
          </div>
        ) : null}

        {report ? (() => {
          const dominantTrigger = pickDominantTrigger(report)
          const tendency = buildTriggerTendencyDescription(dominantTrigger, report)
          const stats = computeRecordsStats(payload, dominantTrigger)
          const situation = inferSituationEmotion(dominantTrigger, report)
          const recurring = inferRecurringPattern(dominantTrigger, report)
          const automatic = inferAutomaticBehavior(dominantTrigger)

          return (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* BLOCO 1 — IMPACTO IMEDIATO */}
              <div className="card" style={{ borderColor: 'rgba(240,156,74,0.35)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                    Você <span style={{ color: 'var(--gold-2)' }}>não tem</span> um problema com dinheiro.
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>
                    Você tem um <span style={{ color: 'var(--gold-2)' }}>padrão</span> que te faz perder dinheiro.
                  </div>
                </div>
              </div>

              {/* BLOCO 2 — GATILHO DOMINANTE */}
              <div className="card" style={{ borderColor: 'var(--gold-2)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={16} style={{ color: 'var(--gold-2)' }} />
                    <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>Gatilho principal identificado</div>
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: '-0.01em' }}>
                    {dominantTrigger}
                  </div>
                  <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.65 }}>
                    <div>Você gasta quando:</div>
                    <div>
                      → <strong style={{ color: 'var(--gold-2)' }}>{situation}</strong>
                    </div>
                    <div>
                      → <strong style={{ color: 'var(--gold-2)' }}>{recurring}</strong>
                    </div>
                    <div>
                      → <strong style={{ color: 'var(--gold-2)' }}>{automatic}</strong>
                    </div>
                  </div>
                  <div className="muted" style={{ lineHeight: 1.65 }}>
                    {tendency}
                  </div>
                </div>
              </div>

              {/* BLOCO 3 — PROVA (DADOS) */}
              <div className="card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>Seus próprios registros mostraram que:</div>
                  {stats ? (
                    <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.7 }}>
                      <div>
                        - Você repetiu esse padrão em <strong style={{ color: 'var(--gold-2)' }}>{stats.repeatedMoments}</strong> momentos
                      </div>
                      <div>
                        - Ele apareceu principalmente em <strong style={{ color: 'var(--gold-2)' }}>{stats.context}</strong>
                      </div>
                      <div>
                        Você tentou controlar, mas voltou ao mesmo comportamento{stats.attemptedControlDays ? (
                          <> em <strong style={{ color: 'var(--gold-2)' }}>{stats.attemptedControlDays}</strong> dias</>
                        ) : null}.
                      </div>
                    </div>
                  ) : (
                    <div className="muted" style={{ lineHeight: 1.7 }}>
                      - Você repetiu esse padrão em vários momentos
                      <br />
                      - Ele aparece quando a emoção sobe
                      <br />
                      - Você tenta controlar, mas volta ao automático
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCO 4 — QUEBRA DE ILUSÃO */}
              <div className="card glass-card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 950, lineHeight: 1.35, fontSize: 16 }}>
                    Isso não é falta de dinheiro.
                  </div>
                  <div className="muted" style={{ lineHeight: 1.65 }}>
                    Isso é falta de <strong style={{ color: 'var(--gold-2)' }}>controle emocional</strong> sobre decisões financeiras.
                  </div>
                </div>
              </div>

              {/* BLOCO 5 — CONSEQUÊNCIA */}
              <div className="card" style={{ borderColor: 'rgba(240,156,74,0.35)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900 }}>
                    <AlertTriangle size={16} style={{ color: 'rgba(240,156,74,0.9)' }} />
                    <span>Se você continuar assim:</span>
                  </div>
                  <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.7 }}>
                    <div>- vai continuar ganhando… e perdendo no mesmo ritmo</div>
                    <div>- nunca vai construir patrimônio de verdade</div>
                    <div>- sempre vai sentir que está recomeçando</div>
                  </div>
                </div>
              </div>

              {/* BLOCO 6 — VIRADA PSICOLÓGICA */}
              <div className="card glass-card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>Mas existe uma diferença entre você de antes e você agora:</div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    Agora você sabe exatamente o que te faz perder dinheiro.
                  </div>
                  <div style={{ fontWeight: 950, color: 'var(--gold-2)' }}>Isso muda tudo.</div>
                </div>
              </div>

              {/* BLOCO 7 — SOLUÇÃO */}
              <div className="card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>A próxima fase da jornada não é sobre aprender mais.</div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    É sobre reprogramar esse <strong style={{ color: 'var(--gold-2)' }}>padrão</strong>.
                  </div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    Ela foi criada exatamente para isso.
                  </div>
                </div>
              </div>

              {/* BLOCO 8 — CTA ULTRA FORTE */}
              <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <Link className="btn btn-primary btn-block btn-mentor-glow" to="/assinatura" style={{ justifyContent: 'center' }}>
                    Quero assumir o controle do meu dinheiro
                  </Link>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    Acesso imediato à próxima fase
                  </div>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--gold-2)', verticalAlign: '-2px' }} />{' '}
                    Quem ignora esse padrão, repete ele.
                  </div>
                </div>
              </div>
            </div>
          )
        })() : null}
      </SectionCard>
    </div>
  )
}
