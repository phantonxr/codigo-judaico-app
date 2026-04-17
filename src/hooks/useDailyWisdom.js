import { useEffect, useState } from 'react'
import { apiFetch } from '../services/apiClient.js'

export default function useDailyWisdom() {
  const [wisdom, setWisdom] = useState(null)

  useEffect(() => {
    let active = true

    apiFetch('/api/catalog/wisdom/daily')
      .then((data) => {
        if (!active || !data) return
        setWisdom(data)
      })
      .catch(() => {
        if (active) setWisdom(null)
      })

    return () => {
      active = false
    }
  }, [])

  return wisdom
}
