import { readJson, writeJson } from './storage.js'

const KEY = 'challenges_progress'

function defaultState(challenge) {
  return {
    challengeId: challenge.id,
    days: challenge.days,
    checkedDays: Array.from({ length: challenge.days }, () => false),
    reflections: Array.from({ length: challenge.days }, () => ''),
    updatedAt: Date.now(),
  }
}

export function loadAllChallengesProgress() {
  return readJson(KEY, {})
}

export function loadChallengeProgress(challenge) {
  const all = loadAllChallengesProgress()
  const existing = all?.[challenge.id]
  if (existing?.checkedDays?.length) return existing
  return defaultState(challenge)
}

export function saveChallengeProgress(challengeId, progress) {
  const all = loadAllChallengesProgress()
  const nextAll = {
    ...(all ?? {}),
    [challengeId]: { ...(progress ?? {}), updatedAt: Date.now() },
  }
  writeJson(KEY, nextAll)
  return nextAll
}

export function computeProgressPct(progress) {
  const checked = Array.isArray(progress?.checkedDays) ? progress.checkedDays : []
  if (!checked.length) return 0
  const done = checked.filter(Boolean).length
  return Math.round((done / checked.length) * 100)
}

export function currentDayIndex(progress) {
  const checked = Array.isArray(progress?.checkedDays) ? progress.checkedDays : []
  const firstIncomplete = checked.findIndex((v) => !v)
  return firstIncomplete === -1 ? checked.length - 1 : firstIncomplete
}

// TODO: persistir progresso por usuário (quando houver auth)
