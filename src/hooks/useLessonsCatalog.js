import { useEffect, useState } from 'react'
import { apiFetch } from '../services/apiClient.js'

export default function useLessonsCatalog() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    apiFetch('/api/catalog/lessons')
      .then((data) => {
        if (!active || !Array.isArray(data)) return
        setLessons(data)
      })
      .catch(() => {
        if (active) setLessons([])
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
