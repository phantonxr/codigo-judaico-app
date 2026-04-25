import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionCard from '../components/SectionCard.jsx'
import { apiFetch } from '../services/apiClient.js'
import {
  get21DayProgress,
  getDayData,
  getDayTaskStatuses,
  getDayStatusSummary,
} from '../hooks/useJourneyProgress.js'
import { createMentorUnlimitedCheckoutSession } from '../services/payments.js'

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

  async function handleMentorUnlimited() {
    const data = await createMentorUnlimitedCheckoutSession()
    const url = String(data?.url ?? '')
    if (url) window.location.href = url
  }

  if (!isEligible) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 12 }}>
        <SectionCard
          title="Relatório Final"
          description="Conclua os 21 dias para liberar seu relatório final com padrões, gatilhos e próximos passos."
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
        title="Relatório Final dos 21 Dias"
        description="Seu diagnóstico final: gatilhos, padrão emocional, risco financeiro e recomendações."
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

        {report ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="card glass-card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>Seu relatório</div>
                <div className="muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {report.reportText}
                </div>
              </div>
            </div>

            {report.offerBlock ? (
              <div className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.55)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontWeight: 900 }}>Próxima fase</div>
                  <div className="muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {report.offerBlock}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link className="btn btn-primary" to="/assinatura">
                      Ver planos (Mensal/Anual)
                    </Link>
                    <button type="button" className="btn btn-soft" onClick={handleMentorUnlimited}>
                      Acompanhamento Rabínico Ilimitado — R$ 17,90/mês
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
