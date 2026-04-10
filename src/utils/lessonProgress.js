import { readJson, writeJson } from './storage.js'

const KEY = 'lessons_progress'

export function loadLessonsProgress() {
  return readJson(KEY, { completed: {}, videos: {} })
}

export function toggleLessonCompleted(lessonId) {
  const state = loadLessonsProgress()
  const completed = { ...(state.completed ?? {}) }
  completed[lessonId] = !completed[lessonId]
  const next = { ...state, completed }
  writeJson(KEY, next)
  return next
}

export function setLessonVideo(lessonId, videoUrl) {
  const state = loadLessonsProgress()
  const videos = { ...(state.videos ?? {}) }
  videos[lessonId] = String(videoUrl ?? '').trim()
  const next = { ...state, videos }
  writeJson(KEY, next)
  return next
}

// TODO: persistir progresso por usuário (quando houver auth)
