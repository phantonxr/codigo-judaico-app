import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function pickDominantTrigger(report, translate) {
  var g = String(report?.gatilhoPrincipal || '').trim()
  if (g) return g
  var top0 = report?.topTriggers?.[0]
  if (top0) return String(top0).trim()
  return translate('report.trigger_fallback')
}

function buildTriggerTendencyDescription(dominantTrigger, report, translate) {
  var dominantN = normalizeText(dominantTrigger)

  if (dominantN.includes('ansied')) {
    return translate('report.tendency_anxiety')
  }

  if (dominantN.includes('compar') || dominantN.includes('status') || dominantN.includes('valid')) {
    return translate('report.tendency_validation')
  }

  if (dominantN.includes('recomp') || dominantN.includes('prazer') || dominantN.includes('imediat')) {
    return translate('report.tendency_reward')
  }

  var emotionalPattern = String(report?.emotionalPattern || '').trim()
  if (emotionalPattern && emotionalPattern.length <= 120) {
    return translate('report.tendency_pattern', { pattern: emotionalPattern.replace(/\.$/, '') })
  }

  return translate('report.tendency_default')
}

function inferSituationEmotion(dominantTrigger, report, translate) {
  var dn = normalizeText(dominantTrigger)
  var ep = normalizeText(report?.emotionalPattern)
  var source = dn + ' ' + ep

  if (source.includes('ansied')) return translate('report.situation_anxiety')
  if (source.includes('estress') || source.includes('press')) return translate('report.situation_pressure')
  if (source.includes('frustra') || source.includes('raiva') || source.includes('irrit')) return translate('report.situation_frustrated')
  if (source.includes('tedio') || source.includes('entedi')) return translate('report.situation_bored')
  if (source.includes('carenc') || source.includes('vazio')) return translate('report.situation_empty')

  return translate('report.situation_default')
}

function inferRecurringPattern(dominantTrigger, report, translate) {
  var dn = normalizeText(dominantTrigger)
  var ep = normalizeText(report?.emotionalPattern)
  var source = dn + ' ' + ep

  if (source.includes('recomp') || source.includes('prazer') || source.includes('imediat') || source.includes('aliv')) {
    return translate('report.pattern_relief')
  }
  if (source.includes('compar') || source.includes('status') || source.includes('valid')) {
    return translate('report.pattern_validation')
  }
  if (source.includes('escasse') || source.includes('oportun') || source.includes('perder')) {
    return translate('report.pattern_urgency')
  }

  return translate('report.pattern_default')
}

function inferAutomaticBehavior(dominantTrigger, translate) {
  var dn = normalizeText(dominantTrigger)
  if (dn.includes('descontrol') || dn.includes('impuls')) return translate('report.behavior_impulse')
  return translate('report.behavior_default')
}

function buildPatternsList(dominantTrigger) {
  var dominantN = normalizeText(dominantTrigger)
  var items = []

  items.push({
    id: 'impulso_emocional',
    icon: Sparkles,
  })

  if (dominantN.includes('recomp') || dominantN.includes('prazer') || dominantN.includes('imediat')) {
    items.push({ id: 'recompensa', icon: CheckCircle2 })
  }

  items.push({
    id: 'consciencia',
    icon: Eye,
  })

  if (items.length < 3) {
    items.push({ id: 'recompensa', icon: CheckCircle2 })
  }

  return items.slice(0, 3)
}

function computeRecordsStats(payload, dominantTrigger, translate) {
  if (!payload) return null

  var triggers = Array.isArray(payload.triggers) ? payload.triggers : []
  var triggerTexts = triggers
    .map(function (x) { return String(x?.trigger || '').trim() })
    .filter(Boolean)

  var daysWithImpulseSignal = triggerTexts.length

  var dominantN = normalizeText(dominantTrigger)
  var dominantKey = dominantN.split(/\s+/).filter(Boolean)[0] || dominantN

  var repeatedMoments = dominantKey
    ? triggerTexts.filter(function (tx) { return normalizeText(tx).includes(dominantKey) }).length
    : 0

  var ctxCounts = { pressao: 0, cansaco: 0, redes: 0, promocoes: 0, familia: 0 }
  for (var i = 0; i < triggerTexts.length; i++) {
    var tx = normalizeText(triggerTexts[i])
    if (tx.includes('trabalho') || tx.includes('prazo') || tx.includes('press')) ctxCounts.pressao++
    if (tx.includes('cans') || tx.includes('noite') || tx.includes('sono')) ctxCounts.cansaco++
    if (tx.includes('instagram') || tx.includes('rede') || tx.includes('social') || tx.includes('compar')) ctxCounts.redes++
    if (tx.includes('promo') || tx.includes('so hoje') || tx.includes('urgenc') || tx.includes('ultima')) ctxCounts.promocoes++
    if (tx.includes('famil') || tx.includes('filh') || tx.includes('marid') || tx.includes('espos')) ctxCounts.familia++
  }

  var context = translate('report.context_default')
  var best = { k: 'none', v: 0 }
  var keys = Object.keys(ctxCounts)
  for (var j = 0; j < keys.length; j++) {
    var k = keys[j]
    if (ctxCounts[k] > best.v) best = { k: k, v: ctxCounts[k] }
  }

  if (best.v > 0) {
    context = best.k === 'pressao'
      ? translate('report.context_pressure')
      : best.k === 'cansaco'
        ? translate('report.context_fatigue')
        : best.k === 'redes'
          ? translate('report.context_social')
          : best.k === 'promocoes'
            ? translate('report.context_promotions')
            : translate('report.context_family')
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
  const { t } = useTranslation()
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
      .catch(() => setError(t('report.error')))
      .finally(() => setLoading(false))
  }, [payload, t])

  if (!isEligible) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 12 }}>
        <SectionCard
          title={t('report.title')}
          description={t('report.description')}
        >
          <Link className="btn btn-primary" to="/desafios">
            {t('report.go_to_challenges_btn')}
          </Link>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 12, paddingBottom: 90 }}>
      <SectionCard title="" description="">
        {loading ? (
          <div className="card" style={{ padding: 12 }}>
            <div className="muted">{t('report.generating')}</div>
          </div>
        ) : null}

        {error ? (
          <div className="card" style={{ padding: 12, borderColor: 'rgba(240,156,74,0.35)' }}>
            <div className="muted">{error}</div>
          </div>
        ) : null}

        {report ? (() => {
          const dominantTrigger = pickDominantTrigger(report, t)
          const tendency = buildTriggerTendencyDescription(dominantTrigger, report, t)
          const stats = computeRecordsStats(payload, dominantTrigger, t)
          const situation = inferSituationEmotion(dominantTrigger, report, t)
          const recurring = inferRecurringPattern(dominantTrigger, report, t)
          const automatic = inferAutomaticBehavior(dominantTrigger, t)
          const block5Items = t('report.block5_items', { returnObjects: true })

          return (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="card" style={{ borderColor: 'rgba(240,156,74,0.35)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.15 }}
                    dangerouslySetInnerHTML={{ __html: t('report.block1_title').replace('<gold>', '<span style="color:var(--gold-2)">').replace('</gold>', '</span>') }}
                  />
                  <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}
                    dangerouslySetInnerHTML={{ __html: t('report.block1_body').replace('<gold>', '<span style="color:var(--gold-2)">').replace('</gold>', '</span>') }}
                  />
                </div>
              </div>

              <div className="card" style={{ borderColor: 'var(--gold-2)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={16} style={{ color: 'var(--gold-2)' }} />
                    <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>{t('report.block2_trigger_title')}</div>
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: '-0.01em' }}>
                    {dominantTrigger}
                  </div>
                  <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.65 }}>
                    <div>{t('report.block2_you_spend')}</div>
                    <div>→ <strong style={{ color: 'var(--gold-2)' }}>{situation}</strong></div>
                    <div>→ <strong style={{ color: 'var(--gold-2)' }}>{recurring}</strong></div>
                    <div>→ <strong style={{ color: 'var(--gold-2)' }}>{automatic}</strong></div>
                  </div>
                  <div className="muted" style={{ lineHeight: 1.65 }}>
                    {tendency}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{t('report.block3_records_title')}</div>
                  {stats ? (
                    <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.7 }}>
                      <div dangerouslySetInnerHTML={{ __html: t('report.block3_repeated', { count: stats.repeatedMoments }).replace('<gold>', '<strong style="color:var(--gold-2)">').replace('</gold>', '</strong>') }} />
                      <div dangerouslySetInnerHTML={{ __html: t('report.block3_context', { context: stats.context }).replace('<gold>', '<strong style="color:var(--gold-2)">').replace('</gold>', '</strong>') }} />
                      {stats.attemptedControlDays ? (
                        <div dangerouslySetInnerHTML={{ __html: t('report.block3_control', { count: stats.attemptedControlDays }).replace('<gold>', '<strong style="color:var(--gold-2)">').replace('</gold>', '</strong>') }} />
                      ) : null}
                    </div>
                  ) : (
                    <div className="muted" style={{ lineHeight: 1.7 }}>
                      {t('report.block3_generic_1')}<br />
                      {t('report.block3_generic_2')}<br />
                      {t('report.block3_generic_3')}
                    </div>
                  )}
                </div>
              </div>

              <div className="card glass-card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 950, lineHeight: 1.35, fontSize: 16 }}>
                    {t('report.block4_title')}
                  </div>
                  <div className="muted" style={{ lineHeight: 1.65 }}
                    dangerouslySetInnerHTML={{ __html: t('report.block4_body').replace('<gold>', '<strong style="color:var(--gold-2)">').replace('</gold>', '</strong>') }}
                  />
                </div>
              </div>

              <div className="card" style={{ borderColor: 'rgba(240,156,74,0.35)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900 }}>
                    <AlertTriangle size={16} style={{ color: 'rgba(240,156,74,0.9)' }} />
                    <span>{t('report.block5_title')}</span>
                  </div>
                  <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.7 }}>
                    {Array.isArray(block5Items) && block5Items.map((item, i) => (
                      <div key={i}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card glass-card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{t('report.block6_title')}</div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>{t('report.block6_body')}</div>
                  <div style={{ fontWeight: 950, color: 'var(--gold-2)' }}>{t('report.block6_cta')}</div>
                </div>
              </div>

              <div className="card">
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{t('report.block7_title')}</div>
                  <div className="muted" style={{ lineHeight: 1.75 }}
                    dangerouslySetInnerHTML={{ __html: t('report.block7_body').replace('<gold>', '<strong style="color:var(--gold-2)">').replace('</gold>', '</strong>') }}
                  />
                  <div className="muted" style={{ lineHeight: 1.75 }}>{t('report.block7_body2')}</div>
                </div>
              </div>

              <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                  <Link className="btn btn-primary btn-block btn-mentor-glow" to="/assinatura" style={{ justifyContent: 'center' }}>
                    {t('report.block8_cta')}
                  </Link>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    {t('report.block8_note')}
                  </div>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--gold-2)', verticalAlign: '-2px' }} />{' '}
                    {t('report.block8_pattern')}
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
