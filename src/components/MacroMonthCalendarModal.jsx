import { useState, useCallback } from 'react'
import { Lock, Unlock, Check, ChevronLeft, ChevronRight, Send, Loader, Star, AlertTriangle, BookOpen, Target, Lightbulb } from 'lucide-react'
import {
  buildDayChecklist,
  saveDayChecklist,
  saveDayReflections,
  getDayData,
  getChecklistProgress,
  isDayFullyCompleted,
  hasAIFeedback,
  canSendToAI,
  saveDayAIFeedback,
  completeDayFull,
  getMonthProgress,
  CHECKLIST_IDS,
} from '../hooks/useJourneyProgress.js'
import { getSixMonthDay, MONTH_PLAN } from '../data/sixMonthJourney.js'
import { generateDailyFeedback, generateFallbackFeedback } from '../services/rabbiMentorAI.js'
import { readDiagnosis } from '../hooks/useFinancialDiagnosis.js'

/**
 * MacroMonthCalendarModal -- Premium modal for a single month's 30-day calendar.
 *
 * Props:
 *   monthNum: 1-6
 *   onClose: () => void
 *   assignedTrack: string
 */
export default function MacroMonthCalendarModal({ monthNum, onClose, assignedTrack }) {
  var plan = MONTH_PLAN[monthNum - 1]
  var monthProgress = getMonthProgress(monthNum)

  var stateDay = useState(null)
  var selectedDay = stateDay[0]
  var setSelectedDay = stateDay[1]

  var stateAI = useState(false)
  var isAILoading = stateAI[0]
  var setIsAILoading = stateAI[1]

  var stateErr = useState('')
  var aiError = stateErr[0]
  var setAiError = stateErr[1]

  var stateRefresh = useState(0)
  var refresh = stateRefresh[0]
  var setRefresh = stateRefresh[1]

  var startDayIndex = 21 + (monthNum - 1) * 30

  // Get day info for the 30-day grid
  function getDayInfo(dayInMonth) {
    var globalIdx = startDayIndex + dayInMonth
    var completed = isDayFullyCompleted(globalIdx)
    var hasAI = hasAIFeedback(globalIdx)
    var sixMonthData = getSixMonthDay(dayInMonth + (monthNum - 1) * 30)
    return {
      dayInMonth: dayInMonth,
      globalIdx: globalIdx,
      completed: completed,
      hasAI: hasAI,
      data: sixMonthData,
    }
  }

  // Currently selected day data
  var activeDayInfo = selectedDay !== null ? getDayInfo(selectedDay) : null
  var activeDayContent = activeDayInfo?.data
  var activeSaved = activeDayInfo ? getDayData(activeDayInfo.globalIdx) : null
  var activeChecklist = activeDayInfo ? getChecklistProgress(activeDayInfo.globalIdx) : null
  var activeFeedback = activeSaved?.aiFeedback

  // Checklist state for active day
  var stateCheck = useState({})
  var checkState = stateCheck[0]
  var setCheckState = stateCheck[1]

  var stateWI = useState('')
  var whatIDid = stateWI[0]
  var setWhatIDid = stateWI[1]

  var stateHF = useState('')
  var howIFelt = stateHF[0]
  var setHowIFelt = stateHF[1]

  var stateTr = useState('')
  var trigger = stateTr[0]
  var setTrigger = stateTr[1]

  function openDay(dayInMonth) {
    var globalIdx = startDayIndex + dayInMonth
    // Check if this day is unlocked
    if (dayInMonth > 0 && !isDayFullyCompleted(globalIdx - 1)) return
    setSelectedDay(dayInMonth)
    setAiError('')
    // Load saved data
    var saved = getDayData(globalIdx)
    setCheckState(saved?.checklist || {})
    setWhatIDid(saved?.whatIDid || '')
    setHowIFelt(saved?.howIFelt || '')
    setTrigger(saved?.trigger || '')
  }

  function closeDay() {
    setSelectedDay(null)
    setAiError('')
    setRefresh(function (r) { return r + 1 })
  }

  var handleCheck = useCallback(function (id) {
    if (!activeDayInfo) return
    setCheckState(function (prev) {
      var next = Object.assign({}, prev)
      next[id] = !prev[id]
      saveDayChecklist(activeDayInfo.globalIdx, next)
      return next
    })
  }, [activeDayInfo])

  function saveReflections() {
    if (!activeDayInfo) return
    saveDayReflections(activeDayInfo.globalIdx, {
      whatIDid: whatIDid,
      howIFelt: howIFelt,
      trigger: trigger,
    })
  }

  // Send to AI
  function handleSendToAI() {
    if (!activeDayInfo || !canSendToAI(activeDayInfo.globalIdx)) return
    setIsAILoading(true)
    setAiError('')
    saveReflections()

    var dc = activeDayContent
    var diag = readDiagnosis()

    var completedTasks = []
    var labels = {
      oracao: 'Oracao da manha',
      manha: dc?.manha || 'Atividade da manha',
      tarde: dc?.tarde || 'Atividade da tarde',
      noite: dc?.noite || 'Atividade da noite',
      reflexao: 'Reflexao guiada',
      registro: 'Registro do dia',
      gatilho: 'Identificacao de gatilho',
    }
    for (var id in checkState) {
      if (checkState[id]) completedTasks.push(labels[id] || id)
    }

    var payload = {
      trailType: assignedTrack,
      currentDay: activeDayInfo.globalIdx,
      dayTitle: dc?.title || '',
      monthTitle: plan.title,
      completedTasks: completedTasks,
      reflection: whatIDid,
      howFelt: howIFelt,
      emotionalTrigger: trigger,
      userFinancialProfile: diag ? {
        diagnosis: diag.diagnostico || '',
        rootCause: diag.gatilho || '',
      } : null,
    }

    generateDailyFeedback(payload)
      .then(function (feedback) {
        saveDayAIFeedback(activeDayInfo.globalIdx, feedback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
      .catch(function () {
        setAiError('Modo offline: feedback gerado localmente.')
        var fallback = generateFallbackFeedback(payload)
        saveDayAIFeedback(activeDayInfo.globalIdx, fallback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
  }

  function handleCompleteDay() {
    if (!activeDayInfo) return
    completeDayFull(activeDayInfo.globalIdx)
    if (selectedDay < 29) {
      openDay(selectedDay + 1)
    } else {
      closeDay()
    }
  }

  // Check if day is first unlocked incomplete
  function isDayUnlocked(dayInMonth) {
    if (dayInMonth === 0) return true
    return isDayFullyCompleted(startDayIndex + dayInMonth - 1)
  }

  // Re-read feedback after refresh
  var currentFeedback = activeDayInfo ? getDayData(activeDayInfo.globalIdx)?.aiFeedback : null

  return (
    <div className="drawer-overlay" role="dialog" aria-modal="true" onClick={function (e) {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className="drawer glass-drawer macro-modal">
        {/* Header */}
        <div className="drawer-head">
          <div style={{ display: 'grid', gap: 4, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedDay !== null && (
                <button className="icon-btn" type="button" onClick={closeDay} style={{ width: 32, height: 32 }}>
                  <ChevronLeft size={16} />
                </button>
              )}
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {selectedDay !== null
                  ? plan.title + ' \u2014 Dia ' + (selectedDay + 1) + '/30'
                  : 'Mes ' + monthNum + ': ' + plan.title
                }
              </div>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {selectedDay !== null
                ? activeDayContent?.title || ''
                : plan.subtitle
              }
            </div>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {selectedDay === null ? (
            /* 30-day grid view */
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Month progress */}
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ fontWeight: 800 }}>{monthProgress.completed}/30 dias</span>
                  <span className="muted">{monthProgress.percent}%</span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: monthProgress.percent + '%' }} />
                </div>
              </div>

              {/* Pillars */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {plan.pillars.map(function (p, i) {
                  return (
                    <span key={i} className="badge" style={{ fontSize: 11 }}>{p}</span>
                  )
                })}
              </div>

              {/* 30-day grid */}
              <div className="macro-day-grid">
                {Array.from({ length: 30 }, function (_, i) {
                  var info = getDayInfo(i)
                  var unlocked = isDayUnlocked(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      className={'macro-day-cell' + (info.completed ? ' completed' : '') + (!unlocked ? ' locked' : '') + (info.hasAI ? ' has-ai' : '')}
                      onClick={function () { if (unlocked) openDay(i) }}
                      disabled={!unlocked}
                    >
                      <span className="macro-day-num">{i + 1}</span>
                      {info.completed && <Check size={12} className="macro-day-icon" />}
                      {!info.completed && !unlocked && <Lock size={10} className="macro-day-icon" style={{ opacity: 0.4 }} />}
                    </button>
                  )
                })}
              </div>

              {/* Badges */}
              {plan.badges && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Badges do mes</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {plan.badges.map(function (b) {
                      var earned = isDayFullyCompleted(b.day + 20)
                      return (
                        <span
                          key={b.id}
                          className="badge"
                          style={earned
                            ? { background: 'rgba(74,215,100,0.12)', borderColor: 'rgba(74,215,100,0.35)', color: '#4ad764' }
                            : { opacity: 0.5 }
                          }
                        >
                          {earned ? <Check size={12} /> : <Lock size={12} />}
                          {b.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Month score */}
              <div className="card glass-card">
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Score do Mes {monthNum}</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'grid', gap: 4, textAlign: 'center', flex: 1 }}>
                      <div className="score-number" style={{ color: 'var(--gold-2)' }}>{monthProgress.percent}</div>
                      <div className="muted" style={{ fontSize: 11 }}>Conclusao</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Individual day view */
            <div style={{ display: 'grid', gap: 14 }}>
              {/* Error notice */}
              {aiError && (
                <div className="badge" style={{ background: 'rgba(240,156,74,0.12)', borderColor: 'rgba(240,156,74,0.35)', color: '#f09c4a', justifySelf: 'start' }}>
                  <AlertTriangle size={14} /> {aiError}
                </div>
              )}

              {/* Day content */}
              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--gold-2)' }}>Atividades do dia</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Oracao</div>
                      <div style={{ fontStyle: 'italic', fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{activeDayContent?.oracao}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manha</div>
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{activeDayContent?.manha}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tarde</div>
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{activeDayContent?.tarde}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Noite</div>
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{activeDayContent?.noite}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="card glass-card checklist-card">
                <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--gold-2)' }}>Checklist</div>
                    <span className="badge">{activeChecklist?.checked || 0}/{activeChecklist?.total || 7}</span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: (activeChecklist?.percent || 0) + '%' }} />
                  </div>
                  <div className="checklist-container">
                    {buildDayChecklist(activeDayContent).map(function (item) {
                      var checked = Boolean(checkState[item.id])
                      return (
                        <label key={item.id} className={'checklist-item' + (checked ? ' checked' : '')}>
                          <input type="checkbox" checked={checked} onChange={function () { handleCheck(item.id) }} />
                          <div className="checklist-item-content">
                            <div className="checklist-item-label">{item.label}</div>
                            {item.description && <div className="checklist-item-desc">{item.description}</div>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Reflections */}
              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Reflexoes do dia</div>
                  <div className="field">
                    <label>O que fiz hoje</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Descreva o que executou..."
                      value={whatIDid}
                      onChange={function (e) { setWhatIDid(e.target.value) }}
                      onBlur={saveReflections}
                    />
                  </div>
                  <div className="field">
                    <label>Como me senti</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Descreva suas emocoes..."
                      value={howIFelt}
                      onChange={function (e) { setHowIFelt(e.target.value) }}
                      onBlur={saveReflections}
                    />
                  </div>
                  <div className="field">
                    <label>Maior gatilho do dia</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Qual foi o maior desafio emocional..."
                      value={trigger}
                      onChange={function (e) { setTrigger(e.target.value) }}
                      onBlur={saveReflections}
                    />
                  </div>
                </div>
              </div>

              {/* Send to AI */}
              {!hasAIFeedback(activeDayInfo.globalIdx) && (
                <button
                  className="btn btn-primary btn-block"
                  type="button"
                  onClick={handleSendToAI}
                  disabled={!canSendToAI(activeDayInfo.globalIdx) || isAILoading}
                >
                  {isAILoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader size={16} className="spin" /> Consultando Rabino Mentor...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Send size={16} /> Enviar para Rabino Mentor IA
                    </span>
                  )}
                </button>
              )}

              {/* AI Feedback */}
              {currentFeedback && (
                <div className="ai-feedback-wrapper glass-card">
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="ai-avatar"><Star size={20} /></div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--gold-2)' }}>Feedback do Rabino Mentor IA</div>
                        <div className="muted" style={{ fontSize: 12 }}>Mes {monthNum}, Dia {selectedDay + 1}</div>
                      </div>
                    </div>

                    {currentFeedback.macroLesson && (
                      <div className="ai-feedback-section">
                        <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                          <BookOpen size={14} />
                          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Licao patrimonial</span>
                        </div>
                        <div className="ai-feedback-section-body">{currentFeedback.macroLesson}</div>
                      </div>
                    )}

                    {currentFeedback.summary && (
                      <div className="ai-feedback-section">
                        <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                          <Target size={14} />
                          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Analise do dia</span>
                        </div>
                        <div className="ai-feedback-section-body">{currentFeedback.summary}</div>
                      </div>
                    )}

                    {currentFeedback.blindspot && (
                      <div className="ai-feedback-section">
                        <div className="ai-feedback-section-head" style={{ color: '#f09c4a' }}>
                          <AlertTriangle size={14} />
                          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Ponto cego</span>
                        </div>
                        <div className="ai-feedback-section-body">{currentFeedback.blindspot}</div>
                      </div>
                    )}

                    {currentFeedback.jewishWisdom && (
                      <div className="ai-feedback-section">
                        <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                          <BookOpen size={14} />
                          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sabedoria judaica</span>
                        </div>
                        <div className="ai-feedback-section-body">{currentFeedback.jewishWisdom}</div>
                      </div>
                    )}

                    {currentFeedback.proverb && (
                      <div className="ai-feedback-section" style={{ fontStyle: 'italic', color: '#f0d27a' }}>
                        <div className="ai-feedback-section-body">{currentFeedback.proverb}</div>
                      </div>
                    )}

                    {currentFeedback.extraTask && (
                      <div className="ai-feedback-section" style={{ borderColor: 'rgba(240,156,74,0.3)', background: 'rgba(240,156,74,0.06)' }}>
                        <div className="ai-feedback-section-head" style={{ color: '#f09c4a' }}>
                          <Lightbulb size={14} />
                          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Atividade extra sugerida</span>
                        </div>
                        <div className="ai-feedback-section-body">{currentFeedback.extraTask}</div>
                      </div>
                    )}

                    {(currentFeedback.tomorrowFocus || currentFeedback.nextFocus) && (
                      <div className="ai-feedback-section">
                        <div className="ai-feedback-section-head" style={{ color: '#4ad764' }}>
                          <Target size={14} />
                          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Foco para amanha</span>
                        </div>
                        <div className="ai-feedback-section-body">{currentFeedback.tomorrowFocus || currentFeedback.nextFocus}</div>
                      </div>
                    )}

                    {currentFeedback.receivedAt && (
                      <div className="muted" style={{ fontSize: 11, textAlign: 'right' }}>
                        Recebido em {new Date(currentFeedback.receivedAt).toLocaleString('pt-BR')}
                      </div>
                    )}

                    {/* Complete day button */}
                    {!isDayFullyCompleted(activeDayInfo.globalIdx) && (
                      <button
                        className="btn btn-primary btn-block btn-done"
                        type="button"
                        onClick={handleCompleteDay}
                      >
                        <Check size={16} /> Concluir dia {selectedDay + 1} e liberar proximo
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Already completed */}
              {isDayFullyCompleted(activeDayInfo.globalIdx) && !currentFeedback && (
                <div className="badge" style={{ background: 'rgba(74,215,100,0.12)', borderColor: 'rgba(74,215,100,0.35)', color: '#4ad764', justifySelf: 'start' }}>
                  <Check size={14} /> Dia concluido
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-foot">
          <button className="btn" type="button" onClick={selectedDay !== null ? closeDay : onClose}>
            {selectedDay !== null ? 'Voltar ao mes' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  )
}
