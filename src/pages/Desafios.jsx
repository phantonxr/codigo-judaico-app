import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check, Lock, Loader, Star, AlertTriangle,
  BookOpen, Target, ChevronRight, Flame, Shield, Circle, CircleDot, Sparkles,
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import MonthMilestoneCard from '../components/MonthMilestoneCard.jsx'
import MacroMonthCalendarModal from '../components/MacroMonthCalendarModal.jsx'
import useFinancialDiagnosis, { readDiagnosis } from '../hooks/useFinancialDiagnosis.js'
import {
  buildDayChecklist,
  saveDayReflections,
  getDayData,
  isDayFullyCompleted,
  hasAIFeedback,
  saveDayAIFeedback,
  completeDayFull,
  getNextUnlockedDay,
  get21DayProgress,
  get6MonthProgress,
  getPhase,
  getCurrentDayIndex,
  getFullPhase,
  TASK_STATUSES,
  CHECKLIST_IDS,
  getDayTaskStatuses,
  saveTaskStatus,
  getDayStatusSummary,
} from '../hooks/useJourneyProgress.js'
import { challenges21Days, TRACK_LABELS, TRACK_DESCRIPTIONS } from '../data/challenges21Days.js'
import { generateDailyFeedback, generateFallbackFeedback, getSavedDailyFeedback } from '../services/rabbiMentorAI.js'

var STATUS_CYCLE = ['none', 'executed', 'partial', 'skipped']

function nextStatus(current) {
  var idx = STATUS_CYCLE.indexOf(current)
  if (idx < 0) idx = 0
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

var STATUS_ICONS = {
  none: Circle,
  executed: Check,
  partial: CircleDot,
  skipped: Circle,
  sent_ai: Sparkles,
}

export default function Desafios() {
  var { assignedTrack } = useFinancialDiagnosis()

  var stateRefresh = useState(0)
  var setRefresh = stateRefresh[1]

  useEffect(function () {
    var sync = function () { setRefresh(function (r) { return r + 1 }) }
    window.addEventListener('journey_progress_updated', sync)
    window.addEventListener('diagnosis_updated', sync)
    return function () {
      window.removeEventListener('journey_progress_updated', sync)
      window.removeEventListener('diagnosis_updated', sync)
    }
  }, [])

  var phase = getPhase()

  if (!assignedTrack) {
    return (
      <div className="container" style={{ display: 'grid', gap: 16, paddingTop: 12 }}>
        <SectionCard
          title="Desafios"
          description="Faca sua avaliacao financeira para desbloquear sua trilha personalizada."
        >
          <Link to="/avaliacao" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Target size={16} /> Iniciar Avaliacao
          </Link>
        </SectionCard>
      </div>
    )
  }

  if (phase === '6months' || phase === 'completed') {
    return <MacroPhaseView assignedTrack={assignedTrack} phase={phase} />
  }

  return <TwentyOneDayView assignedTrack={assignedTrack} />
}

/* ════════════════════════════════════════════════════
   21-DAY PHASE — 4-STATE TASK CARDS
   ════════════════════════════════════════════════════ */

function TwentyOneDayView({ assignedTrack }) {
  var navigate = useNavigate()
  var track = challenges21Days[assignedTrack] || challenges21Days.trilha1
  var trackLabel = TRACK_LABELS[assignedTrack] || assignedTrack

  var p21 = get21DayProgress()
  var nextDay = getNextUnlockedDay()
  var initialDay = Math.min(nextDay, 20)
  var currentPhase = getFullPhase()

  var stateDay = useState(initialDay)
  var selectedDay = stateDay[0]
  var setSelectedDay = stateDay[1]

  var stateAI = useState(false)
  var isAILoading = stateAI[0]
  var setIsAILoading = stateAI[1]

  var stateErr = useState('')
  var aiError = stateErr[0]
  var setAiError = stateErr[1]

  var stateRefresh = useState(0)
  var setRefresh = stateRefresh[1]

  var dayContent = track[selectedDay]
  var saved = getDayData(selectedDay)
  var completed = isDayFullyCompleted(selectedDay)
  var taskStatuses = getDayTaskStatuses(selectedDay)
  var daySummary = getDayStatusSummary(selectedDay)

  var stateWI = useState(saved?.whatIDid || '')
  var whatIDid = stateWI[0]
  var setWhatIDid = stateWI[1]

  var stateHF = useState(saved?.howIFelt || '')
  var howIFelt = stateHF[0]
  var setHowIFelt = stateHF[1]

  var stateTr = useState(saved?.trigger || '')
  var trigger = stateTr[0]
  var setTrigger = stateTr[1]

  function selectDay(idx) {
    if (idx > 0 && !isDayFullyCompleted(idx - 1)) return
    setSelectedDay(idx)
    setAiError('')
    var s = getDayData(idx)
    setWhatIDid(s?.whatIDid || '')
    setHowIFelt(s?.howIFelt || '')
    setTrigger(s?.trigger || '')

    if (!s?.aiFeedback) {
      getSavedDailyFeedback({ phase: '21d', dayNumber: idx + 1 })
        .then(function (fb) {
          saveDayAIFeedback(idx, fb)
          setRefresh(function (r) { return r + 1 })
        })
        .catch(function () {
          // No saved feedback yet; keep local state.
        })
    }
  }

  function handleCycleStatus(taskId) {
    var current = taskStatuses[taskId] || 'none'
    var next = nextStatus(current)
    saveTaskStatus(selectedDay, taskId, next)
    setRefresh(function (r) { return r + 1 })
  }

  function saveReflections() {
    saveDayReflections(selectedDay, { whatIDid: whatIDid, howIFelt: howIFelt, trigger: trigger })
  }

  function handleSendToAI() {
    setIsAILoading(true)
    setAiError('')
    saveReflections()

    var completedTasks = []
    var partialTasks = []
    var notCompletedTasks = []
    var labels = {
      oracao: 'Oracao e intencao financeira',
      manha: dayContent?.manha || 'Revisar gastos e decisoes',
      tarde: dayContent?.tarde || 'Acao financeira consciente',
      noite: dayContent?.noite || 'Separar valor para reserva',
      reflexao: 'Estudar principio judaico do dia',
      registro: 'Registro emocional do dia (antes/depois do impulso)',
      gatilho: 'Identificar o gatilho dominante de gasto',
    }
    var statuses = getDayTaskStatuses(selectedDay)
    for (var id in labels) {
      var s = statuses[id] || 'none'
      var label = labels[id]
      if (s === 'executed' || s === 'sent_ai') {
        completedTasks.push(label)
      } else if (s === 'partial') {
        partialTasks.push(label)
      } else {
        notCompletedTasks.push(label)
      }
    }

    var diag = readDiagnosis()
    var payload = {
      trailType: assignedTrack,
      phase: '21d',
      currentDay: selectedDay,
      dayTitle: dayContent?.title || '',
      completedTasks: completedTasks,
      partialTasks: partialTasks,
      notCompletedTasks: notCompletedTasks,
      reflection: whatIDid,
      howFelt: howIFelt,
      emotionalTrigger: trigger,
      userFinancialProfile: diag
        ? { diagnosis: diag.diagnostico || '', rootCause: diag.gatilho || '' }
        : null,
    }

    generateDailyFeedback(payload)
      .then(function (feedback) {
        saveDayAIFeedback(selectedDay, feedback)
        // Mark all tasks as sent_ai
        for (var i = 0; i < CHECKLIST_IDS.length; i++) {
          var ts = getDayTaskStatuses(selectedDay)[CHECKLIST_IDS[i]] || 'none'
          if (ts !== 'executed') saveTaskStatus(selectedDay, CHECKLIST_IDS[i], 'sent_ai')
        }
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
      .catch(function () {
        setAiError('Modo offline: feedback gerado localmente.')
        var fallback = generateFallbackFeedback(payload)
        saveDayAIFeedback(selectedDay, fallback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
  }

  function handleCompleteDay() {
    completeDayFull(selectedDay)
    if (selectedDay >= 20) {
      navigate('/relatorio-final')
      return
    }

    selectDay(selectedDay + 1)
    setRefresh(function (r) { return r + 1 })
  }

  var feedbackNow = getDayData(selectedDay)?.aiFeedback
  var isMentorV2 = !!(feedbackNow && (
    feedbackNow.feedbackText
    || feedbackNow.detectedTrigger
    || feedbackNow.emotionalPattern
    || feedbackNow.financialRisk
    || feedbackNow.practicalAction
  ))
  var checklist = buildDayChecklist(dayContent)

  // Count statuses for progress display
  var executedCount = 0
  for (var ci = 0; ci < CHECKLIST_IDS.length; ci++) {
    var ts = taskStatuses[CHECKLIST_IDS[ci]] || 'none'
    if (ts === 'executed' || ts === 'sent_ai') executedCount++
  }

  var totalTasks = CHECKLIST_IDS.length
  var circleRadius = 28
  var circleCircumference = 2 * Math.PI * circleRadius
  var circleOffset = circleCircumference - (executedCount / totalTasks) * circleCircumference

  return (
    <div className="container" style={{ display: 'grid', gap: 16, paddingTop: 12, paddingBottom: 100 }}>
      {/* Header: phase + progress */}
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge"><Flame size={14} /> {currentPhase.name}</span>
          <span className="badge" style={{ opacity: 0.8 }}>{trackLabel}</span>
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(215,178,74,0.05)',
          border: '1px solid rgba(215,178,74,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
        }}>
          <span style={{ fontWeight: 700 }}>{p21.completed}/21 dias</span>
          <div className="progress" style={{ flex: 1, margin: '0 12px', height: 5 }}>
            <div className="progress-fill" style={{ width: p21.percent + '%' }} />
          </div>
          <span style={{ color: 'var(--gold-2)', fontWeight: 700 }}>{p21.percent}%</span>
        </div>
      </div>

      {p21.completed >= 21 ? (
        <div className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.55)' }}>
          <div className="card-inner" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 900 }}>Relatório Final liberado</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Veja seus padrões, gatilhos e próximos passos.
              </div>
            </div>
            <Link className="btn btn-primary" to="/relatorio-final">
              Ver Relatório Final
            </Link>
          </div>
        </div>
      ) : null}

      {/* Day navigation */}
      <div className="day-nav-scroll">
        {Array.from({ length: 21 }, function (_, i) {
          var done = isDayFullyCompleted(i)
          var unlocked = i === 0 || isDayFullyCompleted(i - 1)
          var isActive = i === selectedDay
          var summary = getDayStatusSummary(i)
          var dotColor = summary === 'executed' ? '#4ad764' : summary === 'partial' ? '#f0d27a' : summary === 'sent_ai' ? '#b388ff' : 'transparent'
          return (
            <button
              key={i}
              type="button"
              className={
                'day-nav-item'
                + (done ? ' completed' : '')
                + (isActive ? ' active' : '')
                + (!unlocked ? ' locked' : '')
              }
              onClick={function () { if (unlocked) selectDay(i) }}
              disabled={!unlocked}
              style={{ position: 'relative' }}
            >
              {done ? <Check size={12} /> : (i + 1)}
              {dotColor !== 'transparent' && !done && (
                <span style={{
                  position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
                  width: 5, height: 5, borderRadius: '50%', background: dotColor,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Day content */}
      {dayContent && (
        <div className="card glass-card">
          <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--gold-2)' }}>
                Dia {selectedDay + 1}: {dayContent.title}
              </div>
              {completed && (
                <span className="badge" style={{ background: 'rgba(74,215,100,0.12)', borderColor: 'rgba(74,215,100,0.35)', color: '#4ad764' }}>
                  <Check size={12} /> Concluido
                </span>
              )}
            </div>

            {/* Activity sections */}
            <div style={{ display: 'grid', gap: 10 }}>
              {dayContent.oracao && (
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Oracao</div>
                  <div style={{ fontStyle: 'italic', fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{dayContent.oracao}</div>
                </div>
              )}
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manha</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{dayContent.manha}</div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tarde</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{dayContent.tarde}</div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Noite</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{dayContent.noite}</div>
              </div>
            </div>

            {dayContent.proverbio && (
              <div style={{
                fontStyle: 'italic', fontSize: 13, color: '#f0d27a', lineHeight: 1.6,
                padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                {dayContent.proverbio}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4-STATE TASK CARDS WITH CIRCULAR PROGRESS */}
      <div className="card glass-card">
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--gold-2)' }}>Tarefas do dia</div>
            {/* Circular progress indicator */}
            <div className="circular-progress">
              <svg width="64" height="64">
                <circle cx="32" cy="32" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r={circleRadius} fill="none"
                  stroke="var(--gold-2)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={circleOffset}
                  style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <span className="circular-progress-text">{executedCount}/{totalTasks}</span>
            </div>
          </div>

          {executedCount > 0 && executedCount < totalTasks && (
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              Cada tarefa executada fortalece sua estrutura financeira. Continue.
            </div>
          )}
          {executedCount === totalTasks && (
            <div style={{ fontSize: 12, lineHeight: 1.5, color: '#4ad764', fontWeight: 700 }}>
              Todas as tarefas executadas. Sua disciplina esta construindo prosperidade.
            </div>
          )}

          {/* Status legend */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
            {['executed', 'partial', 'skipped', 'sent_ai'].map(function (s) {
              var info = TASK_STATUSES[s]
              return (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, color: info.color }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: info.color, display: 'inline-block' }} />
                  {info.label}
                </span>
              )
            })}
          </div>

          {/* Task cards */}
          <div style={{ display: 'grid', gap: 8 }}>
            {checklist.map(function (item) {
              var status = taskStatuses[item.id] || 'none'
              var info = TASK_STATUSES[status] || TASK_STATUSES.none
              var Icon = STATUS_ICONS[status] || Circle
              return (
                <button
                  key={item.id}
                  type="button"
                  className="task-status-card"
                  onClick={function () { handleCycleStatus(item.id) }}
                  style={{
                    border: '1px solid ' + info.color,
                    background: info.bg,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: '2px solid ' + info.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: status === 'executed' ? 'rgba(74,215,100,0.15)' : 'transparent',
                  }}>
                    <Icon size={16} style={{ color: info.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{item.label}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: info.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {info.label}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
            Toque em cada tarefa para alterar o status
          </div>
        </div>
      </div>

      {/* Reflections */}
      <div className="card" style={{ boxShadow: 'none' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Reflexoes do dia</div>
          {dayContent?.reflexao && (
            <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{dayContent.reflexao}</div>
          )}
          <div className="field">
            <label>O que fiz hoje</label>
            <textarea className="input" rows={2} placeholder="Descreva o que aconteceu (impulso, decisao, contexto, justificativa mental)..." value={whatIDid} onChange={function (e) { setWhatIDid(e.target.value) }} onBlur={saveReflections} />
          </div>
          <div className="field">
            <label>Como me senti</label>
            <textarea className="input" rows={2} placeholder="Quais emocoes vieram antes e depois (ansiedade, culpa, alivio, comparacao, pressao, vazio)?" value={howIFelt} onChange={function (e) { setHowIFelt(e.target.value) }} onBlur={saveReflections} />
          </div>
          <div className="field">
            <label>Gatilho dominante do dia (possível)</label>
            <textarea className="input" rows={2} placeholder="Ex.: recompensa imediata, ansiedade, validacao/status, comparacao social, escassez/FOMO, fuga emocional, culpa, desorganizacao..." value={trigger} onChange={function (e) { setTrigger(e.target.value) }} onBlur={saveReflections} />
          </div>
        </div>
      </div>

      {/* Error */}
      {aiError && (
        <div className="badge" style={{ background: 'rgba(240,156,74,0.12)', borderColor: 'rgba(240,156,74,0.35)', color: '#f09c4a', justifySelf: 'start' }}>
          <AlertTriangle size={14} /> {aiError}
        </div>
      )}

      {/* AI Feedback */}
      {feedbackNow && (
        <div className="ai-feedback-wrapper glass-card">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ai-avatar"><Star size={20} /></div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--gold-2)' }}>Feedback do Rabino Mentor IA</div>
                <div className="muted" style={{ fontSize: 12 }}>Dia {selectedDay + 1}</div>
              </div>
            </div>

            {isMentorV2 ? (
              <>
                {feedbackNow.detectedTrigger ? (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <Target size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Gatilho detectado</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.detectedTrigger}</div>
                  </div>
                ) : null}

                {feedbackNow.emotionalPattern ? (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <Sparkles size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Padrao emocional</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.emotionalPattern}</div>
                  </div>
                ) : null}

                {feedbackNow.financialRisk ? (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: '#f09c4a' }}>
                      <AlertTriangle size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Risco financeiro</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.financialRisk}</div>
                  </div>
                ) : null}

                {feedbackNow.jewishWisdom ? (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <BookOpen size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sabedoria judaica</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.jewishWisdom}</div>
                  </div>
                ) : null}

                {feedbackNow.practicalAction ? (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: '#4ad764' }}>
                      <Target size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Micro-acao</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.practicalAction}</div>
                  </div>
                ) : null}

                {feedbackNow.feedbackText ? (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <Star size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Feedback</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.feedbackText}</div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {feedbackNow.summary && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <Target size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Analise do dia</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.summary}</div>
                  </div>
                )}

                {feedbackNow.correction && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: '#f09c4a' }}>
                      <AlertTriangle size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Correcao de rota</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.correction}</div>
                  </div>
                )}

                {feedbackNow.jewishWisdom && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <BookOpen size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sabedoria judaica</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.jewishWisdom}</div>
                  </div>
                )}

                {feedbackNow.proverb && (
                  <div className="ai-feedback-section" style={{ fontStyle: 'italic', color: '#f0d27a' }}>
                    <div className="ai-feedback-section-body">{feedbackNow.proverb}</div>
                  </div>
                )}

                {feedbackNow.nextFocus && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: '#4ad764' }}>
                      <Target size={14} />
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Foco para amanha</span>
                    </div>
                    <div className="ai-feedback-section-body">{feedbackNow.nextFocus}</div>
                  </div>
                )}
              </>
            )}

            {feedbackNow.receivedAt && (
              <div className="muted" style={{ fontSize: 11, textAlign: 'right' }}>
                Recebido em {new Date(feedbackNow.receivedAt).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Retention copy block */}
      <div className="retention-block">
        <div className="retention-block-body">
          Cada dia nao executado e um passo para tras. A consistencia e a chave da prosperidade.
          Nao existe atalho — existe disciplina diaria.
        </div>
      </div>

      {/* Fixed bottom bar with AI + Complete buttons */}
      <div className="desafios-bottom-bar">
        {!feedbackNow && (
          <button
            className="btn btn-primary btn-mentor-glow"
            type="button"
            onClick={handleSendToAI}
            disabled={isAILoading}
            style={{ flex: 1, maxWidth: 260, justifyContent: 'center', padding: '13px 18px', fontSize: 13 }}
          >
            {isAILoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader size={14} className="spin" /> Enviando...</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={14} /> Enviar para Rabino Mentor</span>
            )}
          </button>
        )}
        {!completed && feedbackNow && (
          <button
            className="btn btn-primary btn-mentor-glow"
            type="button"
            onClick={handleCompleteDay}
            style={{ flex: 1, maxWidth: 440, justifyContent: 'center', padding: '13px 18px' }}
          >
            <Check size={14} /> Concluir dia {selectedDay + 1}
          </button>
        )}
        {!feedbackNow && !completed && (
          <button
            className="btn"
            type="button"
            onClick={handleCompleteDay}
            style={{
              flex: 0, padding: '12px 16px', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
            }}
          >
            <Check size={14} /> Concluir
          </button>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   6-MONTH MACRO PHASE
   ════════════════════════════════════════════════════ */

function MacroPhaseView({ assignedTrack, phase }) {
  var p6m = get6MonthProgress()

  var stateModal = useState(null)
  var openMonth = stateModal[0]
  var setOpenMonth = stateModal[1]

  var stateRefresh = useState(0)
  var setRefresh = stateRefresh[1]

  useEffect(function () {
    var sync = function () { setRefresh(function (r) { return r + 1 }) }
    window.addEventListener('journey_progress_updated', sync)
    return function () { window.removeEventListener('journey_progress_updated', sync) }
  }, [])

  return (
    <div className="container" style={{ display: 'grid', gap: 16, paddingTop: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="badge"><Shield size={14} /> Programa 6 Meses</span>
        {phase === 'completed' && (
          <span className="badge" style={{ background: 'rgba(74,215,100,0.12)', borderColor: 'rgba(74,215,100,0.35)', color: '#4ad764' }}>
            <Star size={14} /> Jornada completa!
          </span>
        )}
      </div>

      <SectionCard title="Construcao Patrimonial" description="180 dias de transformacao financeira profunda">
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 800 }}>{p6m.completed}/180 dias</span>
            <span className="muted">{p6m.percent}%</span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: p6m.percent + '%' }} />
          </div>
        </div>
      </SectionCard>

      <div style={{ fontWeight: 700, letterSpacing: '0.02em' }}>Marcos mensais</div>
      <div className="dashboard-stack">
        {[1, 2, 3, 4, 5, 6].map(function (m) {
          return (
            <MonthMilestoneCard
              key={m}
              monthNum={m}
              onOpen={function (n) { setOpenMonth(n) }}
            />
          )
        })}
      </div>

      {openMonth && (
        <MacroMonthCalendarModal
          monthNum={openMonth}
          onClose={function () { setOpenMonth(null) }}
          assignedTrack={assignedTrack}
        />
      )}
    </div>
  )
}
