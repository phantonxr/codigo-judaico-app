import { syncLessonProgress } from '../services/sessionSync.js'

function safeEmailKey(email) {
  const value = String(email ?? '').trim().toLowerCase()
  return value || 'anon'
}

function readJsonRaw(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJsonRaw(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function startOfWeekKey(date) {
  const d = new Date(date)
  const day = d.getDay() // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7 // Monday=0
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

// -----------------------------
// Lessons progress (per user)
// -----------------------------

export function lessonProgressKey(userEmail) {
  return `lesson_progress_${safeEmailKey(userEmail)}`
}

export function loadLessonProgressList(userEmail) {
  const list = readJsonRaw(lessonProgressKey(userEmail), [])
  return Array.isArray(list) ? list : []
}

export function saveLessonProgressList(userEmail, list) {
  writeJsonRaw(lessonProgressKey(userEmail), Array.isArray(list) ? list : [])
  window.dispatchEvent(new Event('lesson_progress_updated'))
}

export function setLessonCompleted(userEmail, lessonId, completed) {
  const emailKey = safeEmailKey(userEmail)
  const list = loadLessonProgressList(emailKey)
  const id = String(lessonId ?? '')
  const nextCompleted = Boolean(completed)

  const idx = list.findIndex((x) => x?.lessonId === id)
  const next = [...list]
  if (idx === -1) next.push({ lessonId: id, completed: nextCompleted })
  else next[idx] = { ...next[idx], lessonId: id, completed: nextCompleted }

  saveLessonProgressList(emailKey, next)
  syncLessonProgress(userEmail, id, nextCompleted).catch(() => {
    // Keep the local cache if the API is not reachable.
  })
  return next
}

export function toggleLessonCompleted(userEmail, lessonId) {
  const emailKey = safeEmailKey(userEmail)
  const list = loadLessonProgressList(emailKey)
  const id = String(lessonId ?? '')
  const idx = list.findIndex((x) => x?.lessonId === id)
  const current = idx === -1 ? false : Boolean(list[idx]?.completed)
  return setLessonCompleted(emailKey, id, !current)
}

export function getLessonProgress(userEmail, lessons) {
  const list = loadLessonProgressList(userEmail)
  const completedMap = new Map()
  for (const item of list) {
    if (!item?.lessonId) continue
    completedMap.set(String(item.lessonId), Boolean(item.completed))
  }

  const arr = Array.isArray(lessons) ? lessons : []
  const totalLessons = arr.length
  const completedLessons = arr.reduce(
    (acc, lesson) => acc + (completedMap.get(String(lesson?.id)) ? 1 : 0),
    0,
  )

  const progressPercent = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0

  return { completedLessons, totalLessons, progressPercent }
}

// TODO: migrar lesson_progress para Supabase

// -----------------------------
// Challenges progress (per user)
// -----------------------------

export function challengeProgressKey(userEmail) {
  return `challenge_progress_${safeEmailKey(userEmail)}`
}

function defaultChallengeState(challenge) {
  return {
    challengeId: challenge.id,
    days: challenge.days,
    checkedDays: Array.from({ length: challenge.days }, () => false),
    reflections: Array.from({ length: challenge.days }, () => ''),
    updatedAt: Date.now(),
  }
}

export function loadAllChallengesProgress(userEmail) {
  return readJsonRaw(challengeProgressKey(userEmail), {})
}

export function loadChallengeProgress(userEmail, challenge) {
  const all = loadAllChallengesProgress(userEmail)
  const existing = all?.[challenge.id]
  if (existing?.checkedDays?.length) return existing
  return defaultChallengeState(challenge)
}

export function saveChallengeProgress(userEmail, challengeId, progress) {
  const all = loadAllChallengesProgress(userEmail)
  const nextAll = {
    ...(all ?? {}),
    [challengeId]: { ...(progress ?? {}), updatedAt: Date.now() },
  }
  writeJsonRaw(challengeProgressKey(userEmail), nextAll)
  window.dispatchEvent(new Event('challenge_progress_updated'))
  return nextAll
}

export function computeChallengeProgressPct(progress) {
  const checked = Array.isArray(progress?.checkedDays) ? progress.checkedDays : []
  if (!checked.length) return 0
  const done = checked.filter(Boolean).length
  return Math.round((done / checked.length) * 100)
}

export function currentChallengeDayIndex(progress) {
  const checked = Array.isArray(progress?.checkedDays) ? progress.checkedDays : []
  const firstIncomplete = checked.findIndex((v) => !v)
  return firstIncomplete === -1 ? checked.length - 1 : firstIncomplete
}

export function computeChallengeStreak(checkedDays) {
  const arr = Array.isArray(checkedDays) ? checkedDays : []
  let streak = 0
  for (let i = 0; i < arr.length; i += 1) {
    if (!arr[i]) break
    streak += 1
  }
  return streak
}

// TODO: migrar challenge_progress para Supabase

// -----------------------------
// Daily action (per user)
// -----------------------------

function dailyActionsKey(userEmail) {
  return `daily_actions_${safeEmailKey(userEmail)}`
}

export function loadDailyActions(userEmail) {
  const state = readJsonRaw(dailyActionsKey(userEmail), { doneByDate: {} })
  const doneByDate = state?.doneByDate && typeof state.doneByDate === 'object' ? state.doneByDate : {}
  return { doneByDate }
}

export function markDailyActionDone(userEmail, date = todayKey()) {
  const state = loadDailyActions(userEmail)
  const next = {
    doneByDate: { ...(state.doneByDate ?? {}), [date]: true },
  }
  writeJsonRaw(dailyActionsKey(userEmail), next)
  window.dispatchEvent(new Event('daily_action_updated'))
  return next
}

export function isDailyActionDone(userEmail, date = todayKey()) {
  const state = loadDailyActions(userEmail)
  return Boolean(state?.doneByDate?.[date])
}

export function computeDailyStreak(userEmail) {
  const state = loadDailyActions(userEmail)
  const doneByDate = state?.doneByDate ?? {}
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
      cursor.getDate(),
    ).padStart(2, '0')}`
    if (!doneByDate[key]) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function computeWeeklyProgressPct(userEmail, date = new Date()) {
  const state = loadDailyActions(userEmail)
  const doneByDate = state?.doneByDate ?? {}
  const startKey = startOfWeekKey(date)
  const start = new Date(startKey)
  start.setHours(0, 0, 0, 0)

  let done = 0
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
    if (doneByDate[key]) done += 1
  }

  return Math.round((done / 7) * 100)
}
