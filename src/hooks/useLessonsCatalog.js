import { useEffect, useState } from 'react'
import { lessons as fallbackLessons } from '../data/lessons.js'
import { apiFetch } from '../services/apiClient.js'

export default function useLessonsCatalog() {
  const [lessons, setLessons] = useState(() => fallbackLessons)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    apiFetch('/api/catalog/lessons')
      .then((data) => {
        if (!active || !Array.isArray(data) || data.length === 0) return
        setLessons(data)
      })
      .catch(() => {
        // Keep the bundled catalog as a fallback when the API is unavailable.
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { lessons, loading }
}
