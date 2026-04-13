import LessonCard from '../components/LessonCard.jsx'
import SectionCard from '../components/SectionCard.jsx'
import { lessons } from '../data/lessons.js'
import { useEffect, useMemo, useState } from 'react'
import useCurrentUser from '../hooks/useCurrentUser.js'
import {
  loadLessonProgressList,
  toggleLessonCompleted,
} from '../utils/progress.js'

export default function Biblioteca() {
  const currentUser = useCurrentUser()
  const userEmail = currentUser?.email
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState(() => loadLessonProgressList(userEmail))

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const sync = () => setList(loadLessonProgressList(userEmail))
    sync()
    window.addEventListener('lesson_progress_updated', sync)
    window.addEventListener('auth_user_updated', sync)
    return () => {
      window.removeEventListener('lesson_progress_updated', sync)
      window.removeEventListener('auth_user_updated', sync)
    }
  }, [userEmail])

  const completedById = useMemo(() => {
    const map = new Map()
    for (const item of Array.isArray(list) ? list : []) {
      if (!item?.lessonId) continue
      map.set(String(item.lessonId), Boolean(item.completed))
    }
    return map
  }, [list])

  const completedCount = useMemo(() => {
    let count = 0
    for (const l of lessons) {
      if (completedById.get(String(l.id))) count += 1
    }
    return count
  }, [completedById])

  function onToggle(lessonId) {
    toggleLessonCompleted(userEmail, lessonId)
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title="Biblioteca"
        description={`10 ensinamentos com progresso individual. Concluídas: ${completedCount}/${lessons.length}.`}
      >
        {loading ? (
          <div className="grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={String(i)} className="card">
                <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                  <div className="skeleton" style={{ height: 18, width: '55%' }} />
                  <div className="skeleton" style={{ height: 14, width: '80%' }} />
                  <div className="skeleton" style={{ height: 120, width: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid">
            {lessons.map((l) => (
              <LessonCard
                key={l.id}
                {...l}
                completed={Boolean(completedById.get(String(l.id)))}
                onToggleComplete={() => onToggle(l.id)}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
