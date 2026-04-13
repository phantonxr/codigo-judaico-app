import { useCallback, useEffect, useState } from 'react'
import { readAssignedTrack, readJourneyStartDate } from './useFinancialDiagnosis.js'

var PROGRESS_KEY = 'cj_journey_progress'
var CALENDAR_KEY = 'cj_calendar_data'

// -- Checklist IDS & Task statuses --
export var CHECKLIST_IDS = ['oracao', 'manha', 'tarde', 'noite', 'reflexao', 'registro', 'gatilho']

// Task status: 'none' | 'executed' | 'partial' | 'skipped' | 'sent_ai'
export var TASK_STATUSES = {
  none: { label: 'Nao executado', color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.03)' },
  executed: { label: 'Executado', color: '#4ad764', bg: 'rgba(74,215,100,0.08)' },
  partial: { label: 'Parcial', color: '#f0d27a', bg: 'rgba(240,210,122,0.08)' },
  skipped: { label: 'Nao executado', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' },
  sent_ai: { label: 'Enviado ao Mentor', color: '#b388ff', bg: 'rgba(179,136,255,0.08)' },
}

export function getTaskStatus(dayIndex, taskId) {
  var progress = readJourneyProgress()
  var dd = progress.dayData?.[String(dayIndex)]
  if (!dd?.taskStatuses) return 'none'
  return dd.taskStatuses[taskId] || 'none'
}

export function saveTaskStatus(dayIndex, taskId, status) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)
  if (!progress.dayData) progress.dayData = {}
  if (!progress.dayData[key]) progress.dayData[key] = {}
  if (!progress.dayData[key].taskStatuses) progress.dayData[key].taskStatuses = {}
  progress.dayData[key].taskStatuses[taskId] = status
  // sync old checklist for backward compat
  if (!progress.dayData[key].checklist) progress.dayData[key].checklist = {}
  progress.dayData[key].checklist[taskId] = (status === 'executed' || status === 'sent_ai')
  write(PROGRESS_KEY, progress)
  emitUpdate()
}

export function getDayTaskStatuses(dayIndex) {
  var progress = readJourneyProgress()
  var dd = progress.dayData?.[String(dayIndex)]
  return dd?.taskStatuses || {}
}

export function getDayStatusSummary(dayIndex) {
  var statuses = getDayTaskStatuses(dayIndex)
  var counts = { executed: 0, partial: 0, skipped: 0, sent_ai: 0, none: 0 }
  for (var i = 0; i < CHECKLIST_IDS.length; i++) {
    var s = statuses[CHECKLIST_IDS[i]] || 'none'
    counts[s] = (counts[s] || 0) + 1
  }
  var hasFeedback = hasAIFeedback(dayIndex)
  if (counts.executed === CHECKLIST_IDS.length) return 'executed'
  if (hasFeedback) return 'sent_ai'
  if (counts.executed > 0 || counts.partial > 0) return 'partial'
  return 'none'
}

// -- 4-Phase system --
// Phase 1: Seder HaKesef — days 0-20 (21 days)
// Phase 2: Chodesh HaMelech — days 21-50 (30 days = 1 month)
// Phase 3: Mahalach HaZera — days 51-200 (150 days = ~5 months)
// Phase 4: Shnat HaKatzir — days 201-365 (165 days)

export var ESCADA_PHASES = [
  {
    id: 'seder_hakesef', name: 'Seder HaKesef', subtitle: '21 dias da estabilizacao',
    promise: 'Estabilizacao financeira e identificacao dos gatilhos mentais',
    reward: 'Desbloqueia Chodesh HaMelech — 1 mes do dominio',
    startDay: 0, endDay: 20, totalDays: 21,
    icon: 'flame', color: 'var(--gold-2)',
  },
  {
    id: 'chodesh_hamelech', name: 'Chodesh HaMelech', subtitle: '1 mes do dominio',
    promise: 'Controle emocional e dominio da vida financeira',
    reward: 'Desbloqueia Mahalach HaZera — 6 meses da plantacao',
    startDay: 21, endDay: 50, totalDays: 30,
    icon: 'crown', color: '#64b5f6',
  },
  {
    id: 'mahalach_hazera', name: 'Mahalach HaZera', subtitle: '6 meses da plantacao',
    promise: 'Plantacao dos frutos, patrimonio e liberdade',
    reward: 'Desbloqueia Shnat HaKatzir — 365 dias da colheita maxima',
    startDay: 51, endDay: 200, totalDays: 150,
    icon: 'sprout', color: '#81c784',
  },
  {
    id: 'shnat_hakatzir', name: 'Shnat HaKatzir', subtitle: '365 dias da colheita maxima',
    promise: 'Colheita maxima e desfrutar do melhor da terra',
    reward: 'Prosperidade plena — legado construido',
    startDay: 201, endDay: 365, totalDays: 165,
    icon: 'star', color: '#4ad764',
  },
]

export function getFullPhase() {
  var dayIndex = getCurrentDayIndex()
  var p21 = get21DayProgress()
  // Phase is determined by completed days, not calendar
  if (p21.completed < 21) return ESCADA_PHASES[0]
  var p2 = getPhaseProgress(1)
  if (p2.completed < ESCADA_PHASES[1].totalDays) return ESCADA_PHASES[1]
  var p3 = getPhaseProgress(2)
  if (p3.completed < ESCADA_PHASES[2].totalDays) return ESCADA_PHASES[2]
  return ESCADA_PHASES[3]
}

export function isPhaseUnlocked(phaseIndex) {
  if (phaseIndex === 0) return true
  if (phaseIndex === 1) return get21DayProgress().completed >= 21
  if (phaseIndex === 2) return getPhaseProgress(1).completed >= ESCADA_PHASES[1].totalDays
  if (phaseIndex === 3) return getPhaseProgress(2).completed >= ESCADA_PHASES[2].totalDays
  return false
}

export function getPhaseProgress(phaseIndex) {
  var ph = ESCADA_PHASES[phaseIndex]
  if (!ph) return { completed: 0, total: 0, percent: 0 }
  var progress = readJourneyProgress()
  var completed = 0
  for (var i = ph.startDay; i <= ph.endDay; i++) {
    if (progress.completedDays?.[String(i)]) completed++
  }
  return {
    completed: completed,
    total: ph.totalDays,
    percent: Math.round((completed / ph.totalDays) * 100),
    daysRemaining: ph.totalDays - completed,
  }
}

export function getTotalJourneyProgress() {
  var progress = readJourneyProgress()
  var completed = 0
  for (var i = 0; i <= 365; i++) {
    if (progress.completedDays?.[String(i)]) completed++
  }
  return { completed: completed, total: 366, percent: Math.round((completed / 366) * 100) }
}

export function buildDayChecklist(dayData) {
  if (!dayData) return []
  return [
    { id: 'oracao', label: 'Oracao e intencao financeira', description: dayData.oracao, period: 'manha' },
    { id: 'manha', label: 'Revisar gastos e decisoes', description: dayData.manha, period: 'manha' },
    { id: 'tarde', label: 'Acao financeira consciente', description: dayData.tarde, period: 'tarde' },
    { id: 'noite', label: 'Separar valor para reserva', description: dayData.noite, period: 'noite' },
    { id: 'reflexao', label: 'Estudar principio judaico do dia', description: dayData.reflexao, period: 'noite' },
    { id: 'registro', label: 'Registrar gatilho emocional de compra', period: 'noite' },
    { id: 'gatilho', label: 'Identificar decisao financeira sabia', period: 'noite' },
  ]
}

// -- Storage helpers --
function read(key, fallback) {
  try {
    var raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // ignore
  }
}

function todayKey() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function daysBetween(startStr, endStr) {
  var start = new Date(startStr)
  var end = new Date(endStr)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.floor((end - start) / (1000 * 60 * 60 * 24))
}

function emitUpdate() {
  window.dispatchEvent(new Event('journey_progress_updated'))
}

var DEFAULT_PROGRESS = {
  completedDays: {},
  dayData: {},
  reflections: {},
  streak: 0,
}

export function readJourneyProgress() {
  return read(PROGRESS_KEY, DEFAULT_PROGRESS)
}

export function readCalendarData() {
  return read(CALENDAR_KEY, { completedDays: {} })
}

// -- Day data accessors --

export function getDayData(dayIndex) {
  var progress = readJourneyProgress()
  return progress.dayData?.[String(dayIndex)] || null
}

export function saveDayChecklist(dayIndex, checklistState) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)
  if (!progress.dayData) progress.dayData = {}
  if (!progress.dayData[key]) progress.dayData[key] = {}
  progress.dayData[key].checklist = checklistState
  write(PROGRESS_KEY, progress)
  emitUpdate()
}

export function saveDayReflections(dayIndex, fields) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)
  if (!progress.dayData) progress.dayData = {}
  if (!progress.dayData[key]) progress.dayData[key] = {}
  if (fields.whatIDid !== undefined) progress.dayData[key].whatIDid = fields.whatIDid
  if (fields.howIFelt !== undefined) progress.dayData[key].howIFelt = fields.howIFelt
  if (fields.trigger !== undefined) progress.dayData[key].trigger = fields.trigger
  if (fields.whatIDid) {
    if (!progress.reflections) progress.reflections = {}
    progress.reflections[key] = fields.whatIDid
  }
  write(PROGRESS_KEY, progress)
  emitUpdate()
}

export function saveDayAIFeedback(dayIndex, feedback) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)
  if (!progress.dayData) progress.dayData = {}
  if (!progress.dayData[key]) progress.dayData[key] = {}
  progress.dayData[key].aiFeedback = Object.assign({}, feedback, {
    receivedAt: new Date().toISOString(),
  })
  write(PROGRESS_KEY, progress)
  emitUpdate()
}

// -- Completion logic --

export function getChecklistProgress(dayIndex) {
  var progress = readJourneyProgress()
  var dd = progress.dayData?.[String(dayIndex)]
  if (!dd?.checklist) return { checked: 0, total: CHECKLIST_IDS.length, percent: 0 }
  var checked = 0
  for (var i = 0; i < CHECKLIST_IDS.length; i++) {
    if (dd.checklist[CHECKLIST_IDS[i]]) checked++
  }
  return {
    checked: checked,
    total: CHECKLIST_IDS.length,
    percent: Math.round((checked / CHECKLIST_IDS.length) * 100),
  }
}

export function isChecklistComplete(dayIndex) {
  var p = getChecklistProgress(dayIndex)
  return p.checked >= p.total
}

export function areReflectionsFilled(dayIndex) {
  var progress = readJourneyProgress()
  var dd = progress.dayData?.[String(dayIndex)]
  if (!dd) return false
  return Boolean(dd.whatIDid?.trim()) && Boolean(dd.howIFelt?.trim()) && Boolean(dd.trigger?.trim())
}

export function hasAIFeedback(dayIndex) {
  var progress = readJourneyProgress()
  var dd = progress.dayData?.[String(dayIndex)]
  return Boolean(dd?.aiFeedback?.summary || dd?.aiFeedback?.macroLesson)
}

export function isDayFullyCompleted(dayIndex) {
  var progress = readJourneyProgress()
  return Boolean(progress.completedDays?.[String(dayIndex)])
}

export function canSendToAI(dayIndex) {
  return isChecklistComplete(dayIndex) && areReflectionsFilled(dayIndex)
}

export function getNextUnlockedDay() {
  var progress = readJourneyProgress()
  for (var i = 0; i < 201; i++) {
    if (!progress.completedDays?.[String(i)]) return i
  }
  return 201
}

// -- Mark day completed (full flow) --

export function completeDayFull(dayIndex) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)

  if (!progress.completedDays) progress.completedDays = {}
  progress.completedDays[key] = true

  if (!progress.dayData) progress.dayData = {}
  if (!progress.dayData[key]) progress.dayData[key] = {}
  progress.dayData[key].completedAt = todayKey()

  progress.streak = computeStreak(progress.completedDays)
  write(PROGRESS_KEY, progress)

  var calendar = readCalendarData()
  if (!calendar.completedDays) calendar.completedDays = {}
  calendar.completedDays[todayKey()] = dayIndex
  write(CALENDAR_KEY, calendar)

  emitUpdate()
}

// -- Legacy --

export function markDayCompleted(dayIndex, reflection) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)
  if (!progress.completedDays) progress.completedDays = {}
  progress.completedDays[key] = true
  if (reflection) {
    if (!progress.reflections) progress.reflections = {}
    progress.reflections[key] = reflection
  }
  progress.streak = computeStreak(progress.completedDays)
  write(PROGRESS_KEY, progress)

  var calendar = readCalendarData()
  if (!calendar.completedDays) calendar.completedDays = {}
  calendar.completedDays[todayKey()] = dayIndex
  write(CALENDAR_KEY, calendar)

  emitUpdate()
}

export function markDayUncompleted(dayIndex) {
  var progress = readJourneyProgress()
  var key = String(dayIndex)
  if (progress.completedDays) delete progress.completedDays[key]
  if (progress.reflections) delete progress.reflections[key]
  progress.streak = computeStreak(progress.completedDays || {})
  write(PROGRESS_KEY, progress)
  emitUpdate()
}

// -- Streak --

function computeStreak(completedDays) {
  var keys = Object.keys(completedDays || {}).map(Number).sort(function (a, b) { return b - a })
  if (!keys.length) return 0
  var streak = 0
  for (var i = 0; i < keys.length; i++) {
    if (i === 0 || keys[i] === keys[i - 1] - 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// -- Day / phase calcs --

export function getCurrentDayIndex() {
  var startDate = readJourneyStartDate()
  if (!startDate) return 0
  var days = daysBetween(startDate, todayKey())
  return Math.max(0, days)
}

export function getPhase() {
  var dayIndex = getCurrentDayIndex()
  if (dayIndex < 21) return '21days'
  if (dayIndex < 201) return '6months'
  return 'completed'
}

export function get21DayProgress() {
  var progress = readJourneyProgress()
  var completed = 0
  for (var i = 0; i < 21; i++) {
    if (progress.completedDays?.[String(i)]) completed++
  }
  return { completed: completed, total: 21, percent: Math.round((completed / 21) * 100) }
}

export function get6MonthProgress() {
  var progress = readJourneyProgress()
  var completed = 0
  for (var i = 21; i < 201; i++) {
    if (progress.completedDays?.[String(i)]) completed++
  }
  return { completed: completed, total: 180, percent: Math.round((completed / 180) * 100) }
}

// -- Macro month progress --

export function getMonthProgress(monthNum) {
  var progress = readJourneyProgress()
  var startDay = 21 + (monthNum - 1) * 30
  var endDay = startDay + 30
  var completed = 0
  for (var i = startDay; i < endDay; i++) {
    if (progress.completedDays?.[String(i)]) completed++
  }
  return {
    completed: completed,
    total: 30,
    percent: Math.round((completed / 30) * 100),
  }
}

export function isMonthCompleted(monthNum) {
  var p = getMonthProgress(monthNum)
  return p.completed >= p.total
}

export function isMonthUnlocked(monthNum) {
  if (monthNum === 1) {
    // Unlock month 1 when 21 days are done
    var p21 = get21DayProgress()
    return p21.completed >= 21
  }
  return isMonthCompleted(monthNum - 1)
}

export function getCurrentMacroMonth() {
  for (var m = 6; m >= 1; m--) {
    var p = getMonthProgress(m)
    if (p.completed > 0) return m
  }
  return 1
}

// -- Scores --

export function getEmotionalScore() {
  var progress = readJourneyProgress()
  var dayData = progress.dayData || {}
  var keys = Object.keys(dayData)
  if (!keys.length) return 0

  var score = 0
  var totalDays = 0

  for (var k = 0; k < keys.length; k++) {
    var dd = dayData[keys[k]]
    if (!dd) continue
    totalDays++
    if (dd.trigger?.trim()) score += 15
    if (dd.howIFelt?.trim()) score += 10
    if (dd.whatIDid?.trim()) score += 10
    if (dd.aiFeedback?.summary || dd.aiFeedback?.macroLesson) score += 15
  }

  if (totalDays === 0) return 0
  var maxPerDay = 50
  return Math.min(100, Math.round((score / (totalDays * maxPerDay)) * 100))
}

export function getPatrimonyScore() {
  var progress = readJourneyProgress()
  var completed = Object.keys(progress.completedDays || {}).length
  var streak = progress.streak || 0
  var maxDays = getCurrentDayIndex() + 1
  var completionRate = maxDays > 0 ? completed / maxDays : 0
  var streakBonus = Math.min(20, streak * 2)
  return Math.min(100, Math.round(completionRate * 80 + streakBonus))
}

export function getDisciplineScore() {
  var progress = readJourneyProgress()
  var dayData = progress.dayData || {}
  var keys = Object.keys(dayData)
  if (!keys.length) return 0
  var total = 0
  var count = 0
  for (var k = 0; k < keys.length; k++) {
    var dd = dayData[keys[k]]
    if (!dd?.checklist) continue
    count++
    var checked = 0
    for (var j = 0; j < CHECKLIST_IDS.length; j++) {
      if (dd.checklist[CHECKLIST_IDS[j]]) checked++
    }
    total += checked / CHECKLIST_IDS.length
  }
  if (count === 0) return 0
  return Math.min(100, Math.round((total / count) * 100))
}

export function getLastAIFeedback() {
  var progress = readJourneyProgress()
  var dayData = progress.dayData || {}
  var keys = Object.keys(dayData).map(Number).sort(function (a, b) { return b - a })

  for (var i = 0; i < keys.length; i++) {
    var dd = dayData[String(keys[i])]
    if (dd?.aiFeedback?.summary || dd?.aiFeedback?.macroLesson) {
      return Object.assign({ dayIndex: keys[i] }, dd.aiFeedback)
    }
  }
  return null
}

// -- React hook --

export default function useJourneyProgress() {
  var _init = function () { return readJourneyProgress() }
  var _initDay = function () { return getCurrentDayIndex() }
  var _initPhase = function () { return getPhase() }
  var _initTrack = function () { return readAssignedTrack() }

  var stateP = useState(_init)
  var progress = stateP[0]
  var setProgress = stateP[1]

  var stateD = useState(_initDay)
  var currentDay = stateD[0]
  var setCurrentDay = stateD[1]

  var statePh = useState(_initPhase)
  var phase = statePh[0]
  var setPhase = statePh[1]

  var stateT = useState(_initTrack)
  var assignedTrack = stateT[0]
  var setAssignedTrack = stateT[1]

  useEffect(function () {
    var sync = function () {
      setProgress(readJourneyProgress())
      setCurrentDay(getCurrentDayIndex())
      setPhase(getPhase())
      setAssignedTrack(readAssignedTrack())
    }
    window.addEventListener('journey_progress_updated', sync)
    window.addEventListener('diagnosis_updated', sync)
    window.addEventListener('storage', sync)
    return function () {
      window.removeEventListener('journey_progress_updated', sync)
      window.removeEventListener('diagnosis_updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  var markDay = useCallback(function (dayIndex, reflection) {
    markDayCompleted(dayIndex, reflection)
  }, [])

  var unmarkDay = useCallback(function (dayIndex) {
    markDayUncompleted(dayIndex)
  }, [])

  return {
    progress: progress,
    currentDay: currentDay,
    phase: phase,
    assignedTrack: assignedTrack,
    markDay: markDay,
    unmarkDay: unmarkDay,
    get21DayProgress: get21DayProgress,
    get6MonthProgress: get6MonthProgress,
  }
}
