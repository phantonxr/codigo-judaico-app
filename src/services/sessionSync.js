import { apiFetch } from './apiClient.js'
import { clearAuthToken, readAuthToken, writeAuthToken } from './authStorage.js'

const USER_ID_KEY = 'auth_user_id'
const NAME_KEY = 'auth_user_name'
const EMAIL_KEY = 'auth_user_email'
const PLAN_KEY = 'auth_user_plan'
const PLAN_STATUS_KEY = 'auth_user_plan_status'
const NEXT_CHARGE_DATE_KEY = 'auth_user_next_charge_date'

const DIAGNOSIS_KEY = 'cj_financial_diagnosis'
const TRACK_KEY = 'cj_assigned_track'
const JOURNEY_START_KEY = 'cj_journey_start_date'
const PROGRESS_KEY = 'cj_journey_progress'
const CALENDAR_KEY = 'cj_calendar_data'
const STORAGE_PREFIX = 'cj_prosperidade_v1'

let journeySyncTimer = null

function safeTrim(text) {
  return String(text ?? '').trim()
}

function safeEmailKey(email) {
  const value = safeTrim(email).toLowerCase()
  return value || 'anon'
}

function lessonProgressStorageKey(email) {
  return `lesson_progress_${safeEmailKey(email)}`
}

function mentorChatStorageKey(userId) {
  return `${STORAGE_PREFIX}:mentor_chat:${safeTrim(userId) || 'anon'}`
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function writeRaw(key, value) {
  try {
    const next = safeTrim(value)
    if (!next) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, next)
  } catch {
    // ignore
  }
}

function removeKeys(keys) {
  for (const key of keys) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

function dispatch(name) {
  window.dispatchEvent(new Event(name))
}

function dispatchAll() {
  dispatch('auth_user_updated')
  dispatch('diagnosis_updated')
  dispatch('journey_progress_updated')
  dispatch('lesson_progress_updated')
}

function formatMessageTime(isoDate) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'agora'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toChatCache(messages) {
  const arr = Array.isArray(messages) ? messages : []
  return {
    messages: arr.map((item) => ({
      id: item?.id != null ? `srv_${item.id}` : `srv_${Math.random().toString(16).slice(2)}`,
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content ?? ''),
      timestamp: formatMessageTime(item?.timestamp),
    })),
  }
}

function readAssignedTrackCache() {
  return readJson(TRACK_KEY, null)
}

function readJourneyProgressCache() {
  return readJson(PROGRESS_KEY, {
    completedDays: {},
    dayData: {},
    reflections: {},
    streak: 0,
  })
}

function readCalendarCache() {
  return readJson(CALENDAR_KEY, { completedDays: {} })
}

export function readStoredUserId() {
  return safeTrim(localStorage.getItem(USER_ID_KEY))
}

export function readStoredCurrentUser() {
  return {
    id: readStoredUserId(),
    name: safeTrim(localStorage.getItem(NAME_KEY)) || 'Aluno',
    email: safeTrim(localStorage.getItem(EMAIL_KEY)),
    plan: safeTrim(localStorage.getItem(PLAN_KEY)),
    planStatus: safeTrim(localStorage.getItem(PLAN_STATUS_KEY)),
    nextChargeDate: safeTrim(localStorage.getItem(NEXT_CHARGE_DATE_KEY)),
  }
}

export function clearSessionCache() {
  const current = readStoredCurrentUser()

  clearAuthToken()
  removeKeys([
    USER_ID_KEY,
    NAME_KEY,
    EMAIL_KEY,
    PLAN_KEY,
    PLAN_STATUS_KEY,
    NEXT_CHARGE_DATE_KEY,
    DIAGNOSIS_KEY,
    TRACK_KEY,
    JOURNEY_START_KEY,
    PROGRESS_KEY,
    CALENDAR_KEY,
    mentorChatStorageKey(current.id),
    lessonProgressStorageKey(current.email),
  ])

  dispatchAll()
}

export function hydrateSessionCache(session) {
  if (!session?.user) return null

  const user = session.user
  writeRaw(USER_ID_KEY, user.id)
  writeRaw(NAME_KEY, user.name)
  writeRaw(EMAIL_KEY, user.email)
  writeRaw(PLAN_KEY, user.plan)
  writeRaw(PLAN_STATUS_KEY, user.planStatus)
  writeRaw(NEXT_CHARGE_DATE_KEY, user.nextChargeDate)

  if (session.diagnosis) {
    writeJson(DIAGNOSIS_KEY, {
      trackId: session.diagnosis.trackId,
      trackLabel: session.diagnosis.trackLabel,
      scores: session.diagnosis.scores,
      diagnostico: session.diagnosis.diagnostico,
      gatilho: session.diagnosis.gatilho,
      sabedoria: session.diagnosis.sabedoria,
      proverbio: session.diagnosis.proverbio,
      metodo: session.diagnosis.metodo,
      answeredAt: session.diagnosis.answeredAt,
    })
    writeJson(TRACK_KEY, session.diagnosis.trackId)
  } else {
    removeKeys([DIAGNOSIS_KEY, TRACK_KEY])
  }

  const journey = session.journey ?? {}
  if (journey.assignedTrack) {
    writeJson(TRACK_KEY, journey.assignedTrack)
  }
  if (journey.journeyStartDate) {
    writeRaw(JOURNEY_START_KEY, journey.journeyStartDate)
  } else {
    removeKeys([JOURNEY_START_KEY])
  }
  writeJson(PROGRESS_KEY, journey.progress ?? readJourneyProgressCache())
  writeJson(CALENDAR_KEY, journey.calendar ?? readCalendarCache())

  writeJson(
    lessonProgressStorageKey(user.email),
    Array.isArray(session.lessonProgress) ? session.lessonProgress : [],
  )

  const mentorMessages = Array.isArray(session.mentorMessages) ? session.mentorMessages : []
  if (mentorMessages.length > 0) {
    writeJson(mentorChatStorageKey(user.id), toChatCache(mentorMessages))
  } else {
    removeKeys([mentorChatStorageKey(user.id)])
  }

  dispatchAll()
  return user
}

export function persistAuthenticatedSession(response) {
  if (!response?.token || !response?.session) return null

  writeAuthToken(response.token)
  return hydrateSessionCache(response.session)
}

export async function loginWithPassword(userInput) {
  const payload = {
    email: safeTrim(userInput?.email),
    password: safeTrim(userInput?.password),
  }

  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  persistAuthenticatedSession(response)
  return response?.session ?? null
}

export async function refreshCurrentSession() {
  if (!readAuthToken()) return null

  const session = await apiFetch('/api/auth/session')
  hydrateSessionCache(session)
  return session
}

export async function logoutCurrentSession() {
  if (readAuthToken()) {
    await apiFetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {
      // best effort; local cleanup still runs
    })
  }

  clearSessionCache()
}

export async function syncCurrentUserProfile(userInput) {
  const userId = readStoredUserId()
  if (!userId) return null

  const response = await apiFetch(`/api/users/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify({
      name: safeTrim(userInput?.name),
      plan: safeTrim(userInput?.plan),
      planStatus: safeTrim(userInput?.planStatus),
      nextChargeDate: safeTrim(userInput?.nextChargeDate),
    }),
  })

  writeRaw(NAME_KEY, response?.name)
  writeRaw(PLAN_KEY, response?.plan)
  writeRaw(PLAN_STATUS_KEY, response?.planStatus)
  writeRaw(NEXT_CHARGE_DATE_KEY, response?.nextChargeDate)
  dispatch('auth_user_updated')
  return response
}

export async function syncDiagnosisState(diagnosis, trackId) {
  const userId = readStoredUserId()
  if (!userId || !diagnosis) return null

  const response = await apiFetch(`/api/users/${userId}/diagnosis`, {
    method: 'PUT',
    body: JSON.stringify({
      trackId: safeTrim(trackId || diagnosis?.trackId),
      trackLabel: safeTrim(diagnosis?.trackLabel),
      scores: diagnosis?.scores ?? {},
      diagnostico: safeTrim(diagnosis?.diagnostico),
      gatilho: safeTrim(diagnosis?.gatilho),
      sabedoria: safeTrim(diagnosis?.sabedoria),
      proverbio: safeTrim(diagnosis?.proverbio),
      metodo: safeTrim(diagnosis?.metodo),
      answeredAt: safeTrim(diagnosis?.answeredAt),
    }),
  })

  if (response?.trackId) {
    writeJson(TRACK_KEY, response.trackId)
  }
  dispatch('diagnosis_updated')
  return response
}

export async function syncJourneyState() {
  const userId = readStoredUserId()
  if (!userId) return null

  const response = await apiFetch(`/api/users/${userId}/journey`, {
    method: 'PUT',
    body: JSON.stringify({
      assignedTrack: readAssignedTrackCache(),
      journeyStartDate: safeTrim(localStorage.getItem(JOURNEY_START_KEY)),
      progress: readJourneyProgressCache(),
      calendar: readCalendarCache(),
    }),
  })

  if (response?.assignedTrack) {
    writeJson(TRACK_KEY, response.assignedTrack)
  }
  if (response?.journeyStartDate) {
    writeRaw(JOURNEY_START_KEY, response.journeyStartDate)
  }

  return response
}

export function queueJourneyStateSync(delay = 250) {
  if (journeySyncTimer) {
    clearTimeout(journeySyncTimer)
  }

  journeySyncTimer = setTimeout(() => {
    journeySyncTimer = null
    syncJourneyState().catch(() => {
      // keep local cache when backend is temporarily unavailable
    })
  }, delay)
}

export async function syncLessonProgress(userEmail, lessonId, completed) {
  const userId = readStoredUserId()
  if (!userId) return null

  return apiFetch(`/api/users/${userId}/lessons/progress/${encodeURIComponent(String(lessonId ?? ''))}`, {
    method: 'PUT',
    body: JSON.stringify({ completed: Boolean(completed) }),
  })
}

export async function deleteMentorMessagesOnServer(userId) {
  const normalized = safeTrim(userId || readStoredUserId())
  if (!normalized) return null

  return apiFetch(`/api/users/${normalized}/mentor/messages`, {
    method: 'DELETE',
  })
}
