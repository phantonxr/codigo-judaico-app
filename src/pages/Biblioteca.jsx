import LessonCard from '../components/LessonCard.jsx'
import SectionCard from '../components/SectionCard.jsx'
import { lessons } from '../data/lessons.js'
import { useEffect, useMemo, useState } from 'react'
import {
  loadLessonsProgress,
  toggleLessonCompleted,
} from '../utils/lessonProgress.js'

export default function Biblioteca() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(() => loadLessonsProgress())

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(t)
  }, [])

  const completedCount = useMemo(() => {
    const completed = progress.completed ?? {}
    return Object.values(completed).filter(Boolean).length
  }, [progress])

  function onToggle(lessonId) {
    const next = toggleLessonCompleted(lessonId)
    setProgress(next)
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
                completed={Boolean(progress.completed?.[l.id])}
                onToggleComplete={() => onToggle(l.id)}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
