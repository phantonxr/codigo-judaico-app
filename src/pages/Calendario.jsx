import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Check, Lock, Star, Calendar,
  Eye, Shield, Flame, Award, Send, Loader, AlertTriangle,
  BookOpen, Target, MapPin, Trophy,
} from 'lucide-react'
import SectionCard from '../components/SectionCard.jsx'
import { readAssignedTrack, readJourneyStartDate, readDiagnosis } from '../hooks/useFinancialDiagnosis.js'
import {
  readCalendarData,
  readJourneyProgress,
  getCurrentDayIndex,
  getPhase,
  get21DayProgress,
  get6MonthProgress,
  getDayData,
  isDayFullyCompleted,
  getMonthProgress,
  isMonthCompleted,
  buildDayChecklist,
  saveDayReflections,
  saveDayAIFeedback,
  completeDayFull,
  getDisciplineScore,
  getLastAIFeedback,
  getDayStatusSummary,
  getDayTaskStatuses,
  saveTaskStatus,
  TASK_STATUSES,
  CHECKLIST_IDS,
  getFullPhase,
  ESCADA_PHASES,
  getPhaseProgress,
  getTotalJourneyProgress,
} from '../hooks/useJourneyProgress.js'
import { challenges21Days, TRACK_LABELS } from '../data/challenges21Days.js'
import { MONTH_PLAN, getSixMonthDay } from '../data/sixMonthJourney.js'
import { generateDailyFeedback, generateFallbackFeedback } from '../services/rabbiMentorAI.js'

var WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

var PHASE_NAMES = {
  '21days': 'Seder HaKesef',
  '6months': 'Mahalach HaZera',
  completed: 'Shnat HaKatzir',
}
var PHASE_SUBS = {
  '21days': '21 dias de fundacao',
  '6months': '6 meses de construcao patrimonial',
  completed: 'Jornada completa — colheita',
}

/* Journey milestones */
var MILESTONES = [
  { dayIndex: 6, label: 'Semana 1', icon: '7' },
  { dayIndex: 13, label: 'Semana 2', icon: '14' },
  { dayIndex: 20, label: '21 Dias!', icon: '21' },
  { dayIndex: 50, label: 'Mes 1', icon: 'M1' },
  { dayIndex: 80, label: 'Mes 2', icon: 'M2' },
  { dayIndex: 110, label: 'Mes 3', icon: 'M3' },
  { dayIndex: 140, label: 'Mes 4', icon: 'M4' },
  { dayIndex: 170, label: 'Mes 5', icon: 'M5' },
  { dayIndex: 200, label: 'Jornada Completa!', icon: 'FIM' },
]

function getMilestoneForDayIndex(idx) {
  for (var i = 0; i < MILESTONES.length; i++) {
    if (MILESTONES[i].dayIndex === idx) return MILESTONES[i]
  }
  return null
}

function getNextMilestone(currentIdx) {
  for (var i = 0; i < MILESTONES.length; i++) {
    if (MILESTONES[i].dayIndex > currentIdx) return MILESTONES[i]
  }
  return null
}

function getPhaseForDayIndex(idx) {
  if (idx <= 20) return { name: 'Seder HaKesef', color: 'var(--gold-2)' }
  var macroMonth = Math.floor((idx - 21) / 30) + 1
  if (macroMonth <= 1) return { name: 'Chodesh HaMelech', color: '#64b5f6' }
  if (macroMonth <= 6) return { name: 'Mahalach HaZera', color: '#81c784' }
  return { name: 'Shnat HaKatzir', color: '#4ad764' }
}

export default function Calendario() {
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

  var startDateStr = readJourneyStartDate()
  var assignedTrack = readAssignedTrack()

  if (!startDateStr || !assignedTrack) {
    return (
      <div className="container" style={{ display: 'grid', gap: 16, paddingTop: 12 }}>
        <SectionCard
          title="Central Operacional"
          description="Inicie sua jornada para visualizar o mapa da prosperidade."
        />
      </div>
    )
  }

  var startDate = new Date(startDateStr + 'T00:00:00')

  return <CalendarInner startDate={startDate} assignedTrack={assignedTrack} key={stateRefresh[0]} />
}

function CalendarInner({ startDate, assignedTrack }) {
  var now = new Date()
  var stateMonth = useState(function () { return new Date(now.getFullYear(), now.getMonth(), 1) })
  var viewMonth = stateMonth[0]
  var setViewMonth = stateMonth[1]

  var stateDetail = useState(null)
  var detailDay = stateDetail[0]
  var setDetailDay = stateDetail[1]

  var stateRefresh = useState(0)
  var setRefresh = stateRefresh[1]

  useEffect(function () {
    var sync = function () { setRefresh(function (r) { return r + 1 }) }
    window.addEventListener('journey_progress_updated', sync)
    return function () { window.removeEventListener('journey_progress_updated', sync) }
  }, [])

  var phase = getPhase()
  var p21 = get21DayProgress()
  var p6m = get6MonthProgress()
  var currentIdx = getCurrentDayIndex()
  var calData = readCalendarData()
  var completedDays = calData?.completedDays || {}
  var trackLabel = TRACK_LABELS[assignedTrack] || assignedTrack
  var progress = readJourneyProgress()
  var streak = progress.streak || 0
  var discipline = getDisciplineScore()
  var nextMilestone = getNextMilestone(currentIdx)

  /* Build calendar grid */
  var year = viewMonth.getFullYear()
  var month = viewMonth.getMonth()
  var firstDow = new Date(year, month, 1).getDay()
  var daysInMonth = new Date(year, month + 1, 0).getDate()

  var cells = useMemo(function () {
    var arr = []
    for (var i = 0; i < firstDow; i++) arr.push(null)
    for (var d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [firstDow, daysInMonth])

  function prevMonth() {
    setViewMonth(function (m) { return new Date(m.getFullYear(), m.getMonth() - 1, 1) })
    setDetailDay(null)
  }
  function nextMonth() {
    setViewMonth(function (m) { return new Date(m.getFullYear(), m.getMonth() + 1, 1) })
    setDetailDay(null)
  }

  function dayIndexForDate(d) {
    var date = new Date(year, month, d)
    var diff = Math.floor((date - startDate) / 86400000)
    return diff
  }

  function dateString(d) {
    var mm = String(month + 1).padStart(2, '0')
    var dd = String(d).padStart(2, '0')
    return year + '-' + mm + '-' + dd
  }

  function handleDayClick(d) {
    var idx = dayIndexForDate(d)
    if (idx < 0) return
    setDetailDay({ dayNum: d, dayIndex: idx })
  }

  function handleDrawerClose() {
    setDetailDay(null)
    setRefresh(function (r) { return r + 1 })
  }

  var monthLabel = viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  monthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  /* Earned badges */
  var earnedBadges = []
  MONTH_PLAN.forEach(function (mp) {
    if (!mp.badges) return
    mp.badges.forEach(function (b) {
      var globalIdx = 21 + (mp.month - 1) * 30 + (b.day - 1)
      if (isDayFullyCompleted(globalIdx)) {
        earnedBadges.push({ label: b.label, month: mp.month, id: b.id })
      }
    })
  })

  return (
    <div className="container" style={{ display: 'grid', gap: 16, paddingTop: 12, paddingBottom: 28 }}>
      {/* Header: Central Operacional */}
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge"><MapPin size={14} /> Central Operacional</span>
          <span className="badge">
            {phase === '21days' && <Flame size={14} />}
            {phase === '6months' && <Shield size={14} />}
            {phase === 'completed' && <Star size={14} />}
            {PHASE_NAMES[phase]}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>{PHASE_SUBS[phase]}</div>
      </div>

      {/* Streak + Discipline + Next milestone row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div className="glass-card card" style={{ padding: 14, display: 'grid', gap: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: streak > 0 ? 'var(--gold-2)' : 'var(--muted)' }}>
            <Flame size={16} style={{ verticalAlign: -2, marginRight: 4 }} />{streak}
          </div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Streak (dias)</div>
        </div>
        <div className="glass-card card" style={{ padding: 14, display: 'grid', gap: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: discipline > 50 ? '#4ad764' : 'var(--muted)' }}>
            {discipline}%
          </div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Disciplina</div>
        </div>
        {nextMilestone && (
          <div className="glass-card card" style={{ padding: 14, display: 'grid', gap: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold-2)' }}>
              <Trophy size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              {nextMilestone.label}
            </div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
              Faltam {Math.max(0, nextMilestone.dayIndex - currentIdx)} dias
            </div>
          </div>
        )}
      </div>

      {/* Progress summary */}
      <SectionCard title={trackLabel} description={phase === '21days' ? 'Desafio de 21 dias' : 'Programa de 6 meses'}>
        <div style={{ display: 'grid', gap: 8 }}>
          {phase === '21days' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 800 }}>21 Dias: {p21.completed}/21</span>
                <span className="muted">{p21.percent}%</span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: p21.percent + '%' }} />
              </div>
            </>
          )}
          {(phase === '6months' || phase === 'completed') && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 800 }}>Programa: {p21.completed + p6m.completed}/{21 + 180}</span>
                <span className="muted">{Math.round(((p21.completed + p6m.completed) / 201) * 100)}%</span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: Math.round(((p21.completed + p6m.completed) / 201) * 100) + '%' }} />
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="icon-btn" type="button" onClick={prevMonth}><ChevronLeft size={20} /></button>
        <div style={{ fontWeight: 900, fontSize: 15, textTransform: 'capitalize' }}>{monthLabel}</div>
        <button className="icon-btn" type="button" onClick={nextMonth}><ChevronRight size={20} /></button>
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        textAlign: 'center',
      }}>
        {/* Week header */}
        {WEEKDAYS.map(function (w) {
          return (
            <div key={w} style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-2)', padding: '4px 0', opacity: 0.7 }}>
              {w}
            </div>
          )
        })}

        {/* Day cells */}
        {cells.map(function (d, i) {
          if (d === null) return <div key={'e' + i} />

          var idx = dayIndexForDate(d)
          var ds = dateString(d)
          var isCompleted = Boolean(completedDays[ds]) || (idx >= 0 && isDayFullyCompleted(idx))
          var isToday = ds === now.toISOString().slice(0, 10)
          var isFuture = idx > currentIdx
          var isPast = idx < 0
          var milestone = idx >= 0 ? getMilestoneForDayIndex(idx) : null
          var phaseInfo = idx >= 0 ? getPhaseForDayIndex(idx) : null

          // Color-coded status: verde=executed, cinza=none, amarelo=partial, roxo=sent_ai
          var daySummary = idx >= 0 ? getDayStatusSummary(idx) : 'none'
          var statusColors = {
            executed: { bg: 'rgba(74,215,100,0.1)', border: 'rgba(74,215,100,0.35)', text: '#4ad764' },
            partial: { bg: 'rgba(240,210,122,0.1)', border: 'rgba(240,210,122,0.35)', text: '#f0d27a' },
            sent_ai: { bg: 'rgba(179,136,255,0.1)', border: 'rgba(179,136,255,0.35)', text: '#b388ff' },
            none: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: 'var(--text)' },
          }
          var sc = statusColors[daySummary] || statusColors.none

          var bg = sc.bg
          var border = '1px solid ' + sc.border
          var color = sc.text
          var cursor = 'pointer'
          var extraClass = ''

          if (isCompleted) {
            bg = 'rgba(74,215,100,0.12)'
            border = '1px solid rgba(74,215,100,0.4)'
            color = '#4ad764'
          }
          if (isToday) {
            bg = 'rgba(215,178,74,0.14)'
            border = '1.5px solid rgba(215,178,74,0.6)'
            color = 'var(--gold-2)'
            extraClass = ' glow-pulse'
          }
          if (isPast || isFuture) {
            cursor = 'default'
            if (!isCompleted && !isToday && daySummary === 'none') {
              color = 'rgba(255,255,255,0.2)'
            }
          }
          if (milestone && !isPast) {
            border = '1.5px solid rgba(215,178,74,0.6)'
          }

          return (
            <button
              key={d}
              type="button"
              className={'cal-day' + (isCompleted ? ' completed' : '') + (isToday ? ' today' : '') + extraClass}
              style={{
                width: '100%',
                aspectRatio: '1',
                display: 'grid',
                placeItems: 'center',
                borderRadius: 10,
                background: bg,
                border: border,
                color: color,
                fontSize: 13,
                fontWeight: isToday ? 900 : 600,
                cursor: cursor,
                position: 'relative',
              }}
              onClick={function () { handleDayClick(d) }}
              disabled={isPast}
            >
              {isCompleted ? <Check size={14} /> : d}
              {/* Milestone dot */}
              {milestone && !isPast && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--gold-2)',
                }} />
              )}
              {/* Phase color bar */}
              {phaseInfo && idx >= 0 && !isPast && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 4, height: 4, borderRadius: '50%', background: phaseInfo.color, opacity: 0.6,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Day detail — interactive drawer */}
      {detailDay && (
        <DayDrawer
          dayIndex={detailDay.dayIndex}
          dayNum={detailDay.dayNum}
          assignedTrack={assignedTrack}
          onClose={handleDrawerClose}
        />
      )}

      {/* Earned badges */}
      {earnedBadges.length > 0 && (
        <SectionCard title="Conquistas" description="Badges conquistados na jornada">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {earnedBadges.map(function (b) {
              return (
                <span key={b.id} className="badge" style={{ background: 'rgba(215,178,74,0.12)', borderColor: 'rgba(215,178,74,0.35)', color: 'var(--gold-2)' }}>
                  <Award size={12} /> {b.label}
                </span>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* 6-month overview */}
      {(phase === '6months' || phase === 'completed') && (
        <SectionCard title="Visao 6 Meses" description="Progresso mensal geral">
          <div style={{ display: 'grid', gap: 10 }}>
            {MONTH_PLAN.map(function (mp) {
              var mp6 = getMonthProgress(mp.month)
              var done = isMonthCompleted(mp.month)
              return (
                <div key={mp.month} style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>
                      {done && <Check size={12} style={{ marginRight: 4, verticalAlign: -2, color: '#4ad764' }} />}
                      Mes {mp.month}: {mp.title}
                    </span>
                    <span className="muted">{mp6.percent}%</span>
                  </div>
                  <div className="progress" style={{ height: 4 }}>
                    <div className="progress-fill" style={{ width: mp6.percent + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════
   DAY DRAWER — Full interactive drawer from calendar
   Checklist + Reflections + AI + Complete — all in one place
   ════════════════════════════════════════════════════ */

function DayDrawer({ dayIndex, dayNum, assignedTrack, onClose }) {
  var stateRefresh = useState(0)
  var setRefresh = stateRefresh[1]

  var saved = getDayData(dayIndex)
  var completed = isDayFullyCompleted(dayIndex)
  var currentIdx = getCurrentDayIndex()
  var isAccessible = dayIndex <= currentIdx
  var progress = readJourneyProgress()
  var streak = progress.streak || 0

  /* Determine content source */
  var track = challenges21Days[assignedTrack] || challenges21Days.trilha1
  var content = null
  var phaseLabel = ''
  var phaseInfo = getPhaseForDayIndex(dayIndex)
  if (dayIndex <= 20) {
    content = track[dayIndex]
    phaseLabel = phaseInfo.name + ' — Dia ' + (dayIndex + 1) + '/21'
  } else {
    var macroIdx = dayIndex - 21
    if (macroIdx >= 0 && macroIdx < 180) {
      content = getSixMonthDay(macroIdx)
      phaseLabel = phaseInfo.name + ' — Mes ' + content.month + ', Dia ' + content.dayInMonth
    }
  }

  /* Task status + reflections state */
  var taskStatuses = getDayTaskStatuses(dayIndex)

  var stateWI = useState(saved?.whatIDid || '')
  var whatIDid = stateWI[0]
  var setWhatIDid = stateWI[1]

  var stateHF = useState(saved?.howIFelt || '')
  var howIFelt = stateHF[0]
  var setHowIFelt = stateHF[1]

  var stateTr = useState(saved?.trigger || '')
  var trigger = stateTr[0]
  var setTrigger = stateTr[1]

  var stateAI = useState(false)
  var isAILoading = stateAI[0]
  var setIsAILoading = stateAI[1]

  var stateErr = useState('')
  var aiError = stateErr[0]
  var setAiError = stateErr[1]

  var feedbackNow = getDayData(dayIndex)?.aiFeedback
  var daySummary = getDayStatusSummary(dayIndex)

  function handleCycleStatus(taskId) {
    var current = taskStatuses[taskId] || 'none'
    var cycle = ['none', 'executed', 'partial', 'skipped']
    var cidx = cycle.indexOf(current)
    if (cidx < 0) cidx = 0
    saveTaskStatus(dayIndex, taskId, cycle[(cidx + 1) % cycle.length])
    setRefresh(function (r) { return r + 1 })
  }

  function saveReflections() {
    saveDayReflections(dayIndex, { whatIDid: whatIDid, howIFelt: howIFelt, trigger: trigger })
  }

  function handleSendToAI() {
    setIsAILoading(true)
    setAiError('')
    saveReflections()

    var completedTasks = []
    var labels = {
      oracao: 'Oracao da manha',
      manha: content?.manha || 'Atividade da manha',
      tarde: content?.tarde || 'Atividade da tarde',
      noite: content?.noite || 'Atividade da noite',
      reflexao: 'Reflexao guiada',
      registro: 'Registro do dia',
      gatilho: 'Identificacao de gatilho',
    }
    var statuses = getDayTaskStatuses(dayIndex)
    for (var id in labels) {
      var s = statuses[id] || 'none'
      completedTasks.push(labels[id] + ' (' + (TASK_STATUSES[s]?.label || s) + ')')
    }

    var diag = readDiagnosis()
    var payload = {
      trailType: assignedTrack,
      currentDay: dayIndex,
      dayTitle: content?.title || '',
      completedTasks: completedTasks,
      reflection: whatIDid,
      howFelt: howIFelt,
      emotionalTrigger: trigger,
      userFinancialProfile: diag
        ? { diagnosis: diag.diagnostico || '', rootCause: diag.gatilho || '' }
        : null,
    }

    generateDailyFeedback(payload)
      .then(function (feedback) {
        saveDayAIFeedback(dayIndex, feedback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
      .catch(function () {
        setAiError('Modo offline: feedback gerado localmente.')
        var fallback = generateFallbackFeedback(payload)
        saveDayAIFeedback(dayIndex, fallback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
  }

  function handleCompleteDay() {
    completeDayFull(dayIndex)
    setRefresh(function (r) { return r + 1 })
  }

  var latestFeedback = getDayData(dayIndex)?.aiFeedback || feedbackNow
  var latestCompleted = isDayFullyCompleted(dayIndex)
  var milestone = getMilestoneForDayIndex(dayIndex)
  var nextMil = getNextMilestone(dayIndex)
  var checklist = buildDayChecklist(content)

  // Find next phase reward
  var currentPhase = getFullPhase()
  var nextPhaseIdx = ESCADA_PHASES.indexOf(currentPhase) + 1
  var nextPhaseReward = nextPhaseIdx < ESCADA_PHASES.length ? ESCADA_PHASES[nextPhaseIdx].name : 'Jornada Completa'

  var stateWI = useState(saved?.whatIDid || '')
  var whatIDid = stateWI[0]
  var setWhatIDid = stateWI[1]

  var stateHF = useState(saved?.howIFelt || '')
  var howIFelt = stateHF[0]
  var setHowIFelt = stateHF[1]

  var stateTr = useState(saved?.trigger || '')
  var trigger = stateTr[0]
  var setTrigger = stateTr[1]

  var stateAI = useState(false)
  var isAILoading = stateAI[0]
  var setIsAILoading = stateAI[1]

  var stateErr = useState('')
  var aiError = stateErr[0]
  var setAiError = stateErr[1]

  var clProgress = getChecklistProgress(dayIndex)
  var feedbackNow = getDayData(dayIndex)?.aiFeedback

  var handleCheck = useCallback(function (id) {
    setCheckState(function (prev) {
      var next = Object.assign({}, prev)
      next[id] = !prev[id]
      saveDayChecklist(dayIndex, next)
      return next
    })
  }, [dayIndex])

  function saveReflections() {
    saveDayReflections(dayIndex, { whatIDid: whatIDid, howIFelt: howIFelt, trigger: trigger })
  }

  function handleSendToAI() {
    if (!canSendToAI(dayIndex)) return
    setIsAILoading(true)
    setAiError('')
    saveReflections()

    var completedTasks = []
    var labels = {
      oracao: 'Oracao da manha',
      manha: content?.manha || 'Atividade da manha',
      tarde: content?.tarde || 'Atividade da tarde',
      noite: content?.noite || 'Atividade da noite',
      reflexao: 'Reflexao guiada',
      registro: 'Registro do dia',
      gatilho: 'Identificacao de gatilho',
    }
    for (var id in checkState) {
      if (checkState[id]) completedTasks.push(labels[id] || id)
    }

    var diag = readDiagnosis()
    var payload = {
      trailType: assignedTrack,
      currentDay: dayIndex,
      dayTitle: content?.title || '',
      completedTasks: completedTasks,
      reflection: whatIDid,
      howFelt: howIFelt,
      emotionalTrigger: trigger,
      userFinancialProfile: diag
        ? { diagnosis: diag.diagnostico || '', rootCause: diag.gatilho || '' }
        : null,
    }

    generateDailyFeedback(payload)
      .then(function (feedback) {
        saveDayAIFeedback(dayIndex, feedback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
      .catch(function () {
        setAiError('Modo offline: feedback gerado localmente.')
        var fallback = generateFallbackFeedback(payload)
        saveDayAIFeedback(dayIndex, fallback)
        setIsAILoading(false)
        setRefresh(function (r) { return r + 1 })
      })
  }

  function handleCompleteDay() {
    completeDayFull(dayIndex)
    setRefresh(function (r) { return r + 1 })
  }

  /* Re-read after refresh */
  var latestFeedback = getDayData(dayIndex)?.aiFeedback || feedbackNow
  var latestCompleted = isDayFullyCompleted(dayIndex)
  var milestone = getMilestoneForDayIndex(dayIndex)

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 199 }} />
      <div className="glass-drawer central-drawer" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxHeight: '85vh', overflowY: 'auto', zIndex: 200,
        padding: '20px 20px 28px', borderRadius: '20px 20px 0 0',
      }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--gold-2)' }}>
                {content?.title || 'Dia ' + (dayIndex + 1)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge" style={{ padding: '4px 8px', fontSize: 10, borderColor: phaseInfo.color, color: phaseInfo.color }}>
                  {phaseLabel}
                </span>
                {milestone && (
                  <span className="badge" style={{ padding: '4px 8px', fontSize: 10, background: 'rgba(215,178,74,0.15)', borderColor: 'rgba(215,178,74,0.5)' }}>
                    <Trophy size={10} /> {milestone.label}
                  </span>
                )}
              </div>
            </div>
            {latestCompleted && (
              <span className="badge" style={{ background: 'rgba(74,215,100,0.12)', borderColor: 'rgba(74,215,100,0.35)', color: '#4ad764', flexShrink: 0 }}>
                <Check size={12} /> Concluido
              </span>
            )}
          </div>

          {/* Streak & next milestone info in drawer */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              padding: '8px 12px', borderRadius: 10, flex: 1, minWidth: 100,
              background: 'rgba(215,178,74,0.06)', border: '1px solid rgba(215,178,74,0.15)',
              fontSize: 12, textAlign: 'center',
            }}>
              <div style={{ fontWeight: 900, color: streak > 0 ? 'var(--gold-2)' : 'var(--muted)', fontSize: 16 }}>{streak}</div>
              <div className="muted" style={{ fontSize: 10 }}>Streak</div>
            </div>
            {nextMil && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, flex: 2, minWidth: 140,
                background: 'rgba(215,178,74,0.06)', border: '1px solid rgba(215,178,74,0.15)',
                fontSize: 12,
              }}>
                <div style={{ fontWeight: 800, color: 'var(--gold-2)', fontSize: 12 }}>
                  <Trophy size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{nextMil.label}
                </div>
                <div className="muted" style={{ fontSize: 10 }}>Faltam {Math.max(0, nextMil.dayIndex - dayIndex)} dias</div>
              </div>
            )}
            <div style={{
              padding: '8px 12px', borderRadius: 10, flex: 2, minWidth: 140,
              background: 'rgba(179,136,255,0.06)', border: '1px solid rgba(179,136,255,0.15)',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 800, color: '#b388ff', fontSize: 11 }}>Proximo nivel</div>
              <div className="muted" style={{ fontSize: 10 }}>{nextPhaseReward}</div>
            </div>
          </div>
          {content && (
            <div style={{ display: 'grid', gap: 8, fontSize: 13, lineHeight: 1.6 }}>
              {content.oracao && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--gold-2)', textTransform: 'uppercase', marginBottom: 2 }}>Oracao</div>
                  <div className="muted" style={{ fontStyle: 'italic' }}>{content.oracao}</div>
                </div>
              )}
              {content.manha && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--gold-2)', textTransform: 'uppercase', marginBottom: 2 }}>Manha</div>
                  <div className="muted">{content.manha}</div>
                </div>
              )}
              {content.tarde && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--gold-2)', textTransform: 'uppercase', marginBottom: 2 }}>Tarde</div>
                  <div className="muted">{content.tarde}</div>
                </div>
              )}
              {content.noite && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--gold-2)', textTransform: 'uppercase', marginBottom: 2 }}>Noite</div>
                  <div className="muted">{content.noite}</div>
                </div>
              )}
              {content.proverbio && (
                <div style={{ fontStyle: 'italic', fontSize: 13, color: '#f0d27a', lineHeight: 1.6, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {content.proverbio}
                </div>
              )}
            </div>
          )}

          {/* Task Status Cards (replaces old checklist) */}
          {isAccessible && content && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--gold-2)' }}>Tarefas</div>
                <span className="badge" style={{ padding: '4px 8px', fontSize: 10, background: TASK_STATUSES[daySummary]?.bg, borderColor: TASK_STATUSES[daySummary]?.color, color: TASK_STATUSES[daySummary]?.color }}>
                  {TASK_STATUSES[daySummary]?.label || 'Nao executado'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {checklist.map(function (item) {
                  var status = getDayTaskStatuses(dayIndex)[item.id] || 'none'
                  var info = TASK_STATUSES[status] || TASK_STATUSES.none
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={function () { handleCycleStatus(item.id) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        border: '1px solid ' + info.color,
                        background: info.bg,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <span style={{
                        width: 24, height: 24, borderRadius: 6,
                        border: '2px solid ' + info.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: status === 'executed' ? 'rgba(74,215,100,0.15)' : 'transparent',
                        flexShrink: 0,
                      }}>
                        {status === 'executed' && <Check size={12} style={{ color: info.color }} />}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: info.color, textTransform: 'uppercase' }}>{info.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="muted" style={{ fontSize: 10, textAlign: 'center' }}>Toque para alterar status</div>
            </div>
          )}

          {/* Reflection fields (editable if accessible) */}
          {isAccessible && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>Reflexoes</div>
              {content?.reflexao && (
                <div style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{content.reflexao}</div>
              )}
              <div className="field">
                <label>O que fiz hoje</label>
                <textarea className="input" rows={2} placeholder="Descreva o que executou..." value={whatIDid} onChange={function (e) { setWhatIDid(e.target.value) }} onBlur={saveReflections} />
              </div>
              <div className="field">
                <label>Como me senti</label>
                <textarea className="input" rows={2} placeholder="Descreva suas emocoes..." value={howIFelt} onChange={function (e) { setHowIFelt(e.target.value) }} onBlur={saveReflections} />
              </div>
              <div className="field">
                <label>Maior gatilho do dia</label>
                <textarea className="input" rows={2} placeholder="Qual foi o maior desafio emocional..." value={trigger} onChange={function (e) { setTrigger(e.target.value) }} onBlur={saveReflections} />
              </div>
            </div>
          )}

          {/* Read-only reflections for past days viewed */}
          {!isAccessible && saved && (saved.whatIDid || saved.howIFelt || saved.trigger) && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Suas reflexoes</div>
              {saved.whatIDid && <div style={{ fontSize: 13 }}><span style={{ fontWeight: 700, color: 'var(--gold-2)' }}>O que fiz:</span> <span className="muted">{saved.whatIDid}</span></div>}
              {saved.howIFelt && <div style={{ fontSize: 13 }}><span style={{ fontWeight: 700, color: 'var(--gold-2)' }}>Como me senti:</span> <span className="muted">{saved.howIFelt}</span></div>}
              {saved.trigger && <div style={{ fontSize: 13 }}><span style={{ fontWeight: 700, color: 'var(--gold-2)' }}>Gatilho:</span> <span className="muted">{saved.trigger}</span></div>}
            </div>
          )}

          {/* AI Error */}
          {aiError && (
            <div className="badge" style={{ background: 'rgba(240,156,74,0.12)', borderColor: 'rgba(240,156,74,0.35)', color: '#f09c4a', justifySelf: 'start' }}>
              <AlertTriangle size={14} /> {aiError}
            </div>
          )}

          {/* Send to AI button — ALWAYS ACTIVE */}
          {isAccessible && !latestFeedback && (
            <button
              className="btn btn-primary btn-block"
              type="button"
              onClick={handleSendToAI}
              disabled={isAILoading}
            >
              {isAILoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Loader size={16} className="spin" /> Consultando Rabino Mentor...</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Send size={16} /> Enviar para Rabino Mentor IA</span>
              )}
            </button>
          )}

          {/* AI Feedback display */}
          {latestFeedback && (
            <div className="ai-feedback-wrapper glass-card" style={{ marginTop: 4 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="ai-avatar" style={{ width: 36, height: 36, fontSize: 18 }}><Star size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--gold-2)' }}>Feedback do Rabino Mentor IA</div>
                  </div>
                </div>
                {latestFeedback.summary && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <Target size={14} />
                      <span style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Analise</span>
                    </div>
                    <div className="ai-feedback-section-body" style={{ fontSize: 13 }}>{latestFeedback.summary}</div>
                  </div>
                )}
                {latestFeedback.jewishWisdom && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: 'var(--gold-2)' }}>
                      <BookOpen size={14} />
                      <span style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Sabedoria judaica</span>
                    </div>
                    <div className="ai-feedback-section-body" style={{ fontSize: 13 }}>{latestFeedback.jewishWisdom}</div>
                  </div>
                )}
                {latestFeedback.nextFocus && (
                  <div className="ai-feedback-section">
                    <div className="ai-feedback-section-head" style={{ color: '#4ad764' }}>
                      <Target size={14} />
                      <span style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Foco para amanha</span>
                    </div>
                    <div className="ai-feedback-section-body" style={{ fontSize: 13 }}>{latestFeedback.nextFocus}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete day button */}
          {isAccessible && latestFeedback && !latestCompleted && (
            <button className="btn btn-primary btn-block btn-done" type="button" onClick={handleCompleteDay}>
              <Check size={16} /> Concluir dia e liberar proximo
            </button>
          )}

          {/* Close */}
          <button className="btn btn-soft btn-block" type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </>
  )
}
