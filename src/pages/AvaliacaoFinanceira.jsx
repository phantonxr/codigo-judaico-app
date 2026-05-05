import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionCard from '../components/SectionCard.jsx'
import useFinancialDiagnosis from '../hooks/useFinancialDiagnosis.js'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { TRACK_DESCRIPTIONS, TRACK_LABELS } from '../data/challenges21Days.js'

const QUESTION_CATEGORIES = [
  'impulso', 'impulso', 'impulso', 'impulso', 'impulso',
  'fundacao', 'fundacao', 'fundacao', 'fundacao', 'fundacao',
  'abundancia', 'abundancia', 'abundancia', 'abundancia', 'abundancia',
]

function analyzeDiagnosis(answers, questions) {
  const scores = { impulso: 0, fundacao: 0, abundancia: 0 }
  for (let i = 0; i < questions.length; i++) {
    const qId = 'q' + (i + 1)
    scores[QUESTION_CATEGORIES[i]] += (answers[qId] || 3)
  }

  const max = Math.max(scores.impulso, scores.fundacao, scores.abundancia)
  let trackId

  if (max === scores.impulso) {
    trackId = 'trilha1'
  } else if (max === scores.fundacao) {
    trackId = 'trilha2'
  } else {
    trackId = 'trilha3'
  }

  return {
    trackId,
    scores,
    answeredAt: new Date().toISOString(),
  }
}

function getDiagnosisContent(trackId, t) {
  const key = ['trilha1', 'trilha2', 'trilha3'].includes(trackId) ? trackId : 'trilha3'
  return {
    trackLabel: t(`assessment.content.${key}.trackLabel`),
    diagnostico: t(`assessment.content.${key}.diagnostico`),
    gatilho: t(`assessment.content.${key}.gatilho`),
    sabedoria: t(`assessment.content.${key}.sabedoria`),
    proverbio: t(`assessment.content.${key}.proverbio`),
    metodo: t(`assessment.content.${key}.metodo`),
  }
}

export default function AvaliacaoFinanceira() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { save, diagnosis, assignedTrack } = useFinancialDiagnosis()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  const questions = t('assessment.questions', { returnObjects: true })
  const scaleOptions = t('assessment.scale_options', { returnObjects: true })

  const hasCompletedAssessment = Boolean(currentUser?.hasCompletedAssessment)
    || Boolean(diagnosis?.trackId)
    || Boolean(assignedTrack)

  const lockedTrackId = assignedTrack || diagnosis?.trackId || ''
  const lockedTrackContent = lockedTrackId ? getDiagnosisContent(lockedTrackId, t) : null
  const lockedTrackLabel = lockedTrackContent?.trackLabel || TRACK_LABELS[lockedTrackId] || lockedTrackId
  const lockedTrackDescription = TRACK_DESCRIPTIONS[lockedTrackId] || ''

  const diagnosisText = lockedTrackContent?.diagnostico || ''
  const triggerText = lockedTrackContent?.gatilho || ''
  const diagnosisSummary = diagnosisText.length > 240
    ? diagnosisText.slice(0, 240).trim() + '…'
    : diagnosisText

  const totalQuestions = Array.isArray(questions) ? questions.length : 15
  const questionIndex = step - 1
  const currentQuestion = Array.isArray(questions) ? questions[questionIndex] : null
  const progressPct = step === 0 ? 0 : Math.round((step / (totalQuestions + 1)) * 100)

  function startAssessment() {
    setStep(1)
  }

  function selectAnswer(value) {
    const qId = 'q' + step
    const next = { ...answers, [qId]: value }
    setAnswers(next)

    if (step < totalQuestions) {
      setStep(step + 1)
    } else {
      const diag = analyzeDiagnosis(next, Array.isArray(questions) ? questions : [])
      const content = getDiagnosisContent(diag.trackId, t)
      const fullResult = {
        ...diag,
        trackLabel: content.trackLabel,
        diagnostico: content.diagnostico,
        gatilho: content.gatilho,
        sabedoria: content.sabedoria,
        proverbio: content.proverbio,
        metodo: content.metodo,
      }
      setResult(fullResult)
      save(fullResult, fullResult.trackId)
      setStep(totalQuestions + 1)
    }
  }

  function goToDashboard() {
    navigate('/dashboard')
  }

  function goToDesafios() {
    navigate('/desafios')
  }

  function goToCalendario() {
    navigate('/calendario')
  }

  if (hasCompletedAssessment && lockedTrackId) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
        <SectionCard
          title={t('assessment.completed_title')}
          description={t('assessment.completed_description')}
        >
          <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('assessment.your_track')}
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold-2)', lineHeight: 1.25 }}>
                  {lockedTrackLabel}
                </div>
                {lockedTrackDescription ? (
                  <div className="muted" style={{ lineHeight: 1.7 }}>
                    {lockedTrackDescription}
                  </div>
                ) : null}
              </div>
            </div>

            {diagnosisSummary ? (
              <div className="card" style={{ borderColor: 'rgba(215,178,74,0.18)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('assessment.diagnosis_summary')}
                  </div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    {diagnosisSummary}
                  </div>
                </div>
              </div>
            ) : null}

            {triggerText ? (
              <div className="card" style={{ borderColor: 'rgba(215,178,74,0.18)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('assessment.main_trigger')}
                  </div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    {triggerText}
                  </div>
                </div>
              </div>
            ) : null}

            <button className="btn btn-primary" type="button" onClick={goToDesafios}>
              {t('assessment.continue_journey_btn')}
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  if (step === 0) {
    const whatAnalyzed = t('assessment.what_analyzed', { returnObjects: true })
    const afterItems = t('assessment.after_items', { returnObjects: true })

    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
        <SectionCard title={t('assessment.title')} description={t('assessment.description')}>
          <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--gold-2)' }}>
                  {t('assessment.shalom')}
                </div>
                <div className="muted" style={{ lineHeight: 1.7 }}>
                  {t('assessment.intro_body_1')}
                </div>
                <div className="muted" style={{ lineHeight: 1.7 }}>
                  {t('assessment.intro_body_2')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>{t('assessment.what_analyzed_title')}</div>
              <div className="grid grid-2">
                {Array.isArray(whatAnalyzed) && whatAnalyzed.map(item => (
                  <div key={item} className="badge" style={{ justifyContent: 'flex-start' }}>{item}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>{t('assessment.after_title')}</div>
              <div className="grid" style={{ gap: 8 }}>
                {Array.isArray(afterItems) && afterItems.map(item => (
                  <div key={item} className="muted">✦ {item}</div>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" type="button" onClick={startAssessment} style={{ marginTop: 8 }}>
              {t('assessment.start_btn')}
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  if (step > totalQuestions && result) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
        <SectionCard title={t('assessment.result_title')} description={t('assessment.result_description')}>
          <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>

            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.45)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 10, textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('assessment.result_track_label')}
                </div>
                <div style={{ fontWeight: 900, fontSize: 24, color: 'var(--gold-2)' }}>
                  {result.trackLabel}
                </div>
                <span className="badge" style={{ justifySelf: 'center' }}>{t('assessment.result_track_unlocked')}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('assessment.result_diagnosis')}
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.diagnostico}</div>
              </div>
            </div>

            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.25)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 8, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 18, color: 'var(--gold-2)', lineHeight: 1.6 }}>
                  {result.proverbio}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('assessment.result_root')}
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.gatilho}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('assessment.result_wisdom')}
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.sabedoria}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('assessment.result_method')}
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.metodo}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" type="button" onClick={goToDesafios}>
                {t('assessment.start_21_days_btn')}
              </button>
              <button className="btn" type="button" onClick={goToCalendario}>
                {t('assessment.see_calendar_btn')}
              </button>
              <button className="btn" type="button" onClick={goToDashboard}>
                {t('assessment.go_to_dashboard_btn')}
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
      <SectionCard
        title={t('assessment.title')}
        description={t('assessment.question_progress', { current: step, total: totalQuestions })}
      >
        <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
          <div className="progress" aria-label={t('assessment.question_progress', { current: step, total: totalQuestions })}>
            <div className="progress-fill" style={{ width: `${progressPct}%`, transition: 'width 300ms ease' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="badge">{t('assessment.question_label', { current: step, total: totalQuestions })}</span>
            <span className="badge">{progressPct}%</span>
          </div>

          <div className="card" style={{ borderColor: 'rgba(215,178,74,0.25)' }}>
            <div className="card-inner" style={{ display: 'grid', gap: 14, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.6 }}>
                {currentQuestion}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {Array.isArray(scaleOptions) && scaleOptions.map((label, idx) => {
              const value = idx + 1
              const qId = 'q' + step
              return (
                <button
                  key={value}
                  className={`btn ${answers[qId] === value ? 'btn-primary' : ''}`}
                  type="button"
                  onClick={() => selectAnswer(value)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid rgba(215,178,74,0.35)',
                    display: 'inline-grid',
                    placeItems: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {value}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
