import { useEffect, useState } from 'react'
import { pickWisdomForDate } from '../data/wisdom.js'
import { apiFetch } from '../services/apiClient.js'

export default function useDailyWisdom() {
  const [wisdom, setWisdom] = useState(() => pickWisdomForDate())

  useEffect(() => {
    let active = true

    apiFetch('/api/catalog/wisdom/daily')
      .then((data) => {
        if (!active || !data) return
        setWisdom(data)
      })
      .catch(() => {
        // Keep the bundled wisdom snippet as a fallback.
      })

    return () => {
      active = false
    }
  }, [])

  return wisdom
}
