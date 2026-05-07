import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  hasMarketingConsent,
  PRIVACY_CONSENT_CHANGED_EVENT,
} from '../services/privacyConsent.js'

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

function clearStoredUtm() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage indisponivel (ex: modo privado bloqueado)
  }
}

export function useUtmParams() {
  const [searchParams] = useSearchParams()
  const [marketingConsent, setMarketingConsent] = useState(() => hasMarketingConsent())

  useEffect(() => {
    const syncConsent = () => setMarketingConsent(hasMarketingConsent())
    window.addEventListener(PRIVACY_CONSENT_CHANGED_EVENT, syncConsent)
    window.addEventListener('storage', syncConsent)
    return () => {
      window.removeEventListener(PRIVACY_CONSENT_CHANGED_EVENT, syncConsent)
      window.removeEventListener('storage', syncConsent)
    }
  }, [])

  const urlUtm = useMemo(() => {
    const result = {}
    for (const key of UTM_KEYS) {
      const value = searchParams.get(key)
      if (value) result[key] = value
    }
    return result
  }, [searchParams])

  // UTMs sao marketing/atribuicao: so persistimos apos consentimento explicito.
  useEffect(() => {
    if (!marketingConsent) {
      clearStoredUtm()
      return
    }

    if (Object.keys(urlUtm).length > 0) {
      persistUtm(urlUtm)
    }
  }, [marketingConsent, urlUtm])

  // Prioridade: URL > localStorage (first-touch via storage, last-touch via URL)
  return useMemo(() => {
    if (!marketingConsent) return {}
    return Object.keys(urlUtm).length > 0 ? urlUtm : readStoredUtm()
  }, [marketingConsent, urlUtm])
}
