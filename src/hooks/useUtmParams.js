import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const STORAGE_KEY = 'cj_utm'

function readStoredUtm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistUtm(params) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {
    // localStorage indisponivel (ex: modo privado bloqueado)
  }
}

export function useUtmParams() {
  const [searchParams] = useSearchParams()

  const urlUtm = useMemo(() => {
    const result = {}
    for (const key of UTM_KEYS) {
      const value = searchParams.get(key)
      if (value) result[key] = value
    }
    return result
  }, [searchParams])

  // Salva no localStorage sempre que a URL tiver UTMs
  useEffect(() => {
    if (Object.keys(urlUtm).length > 0) {
      persistUtm(urlUtm)
    }
  }, [urlUtm])

  // Prioridade: URL > localStorage (first-touch via storage, last-touch via URL)
  return useMemo(() => {
    return Object.keys(urlUtm).length > 0 ? urlUtm : readStoredUtm()
  }, [urlUtm])
}
