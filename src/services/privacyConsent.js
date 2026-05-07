export const PRIVACY_CONSENT_CHANGED_EVENT = 'privacy_consent_changed'

const STORAGE_KEY = 'cj_privacy_consent_v1'
const LEGACY_COOKIE_KEY = 'cookie_consent'
const UTM_STORAGE_KEY = 'cj_utm'
const VERSION = 1

const DEFAULT_CONSENT = Object.freeze({
  essential: true,
  preferences: false,
  marketing: false,
  version: VERSION,
  updatedAt: null,
})

function safeBoolean(value) {
  return value === true
}

export function isGlobalPrivacyControlEnabled() {
  return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true
}

function clearMarketingStorage() {
  try {
    localStorage.removeItem(UTM_STORAGE_KEY)
  } catch {
    // localStorage can be blocked in private or hardened browsers.
  }
}

function normalizeConsent(value) {
  if (!value || typeof value !== 'object') return { ...DEFAULT_CONSENT }

  return {
    essential: true,
    preferences: safeBoolean(value.preferences),
    marketing: isGlobalPrivacyControlEnabled() ? false : safeBoolean(value.marketing),
    version: VERSION,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  }
}

export function readPrivacyConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONSENT }
    return normalizeConsent(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_CONSENT }
  }
}

export function hasPrivacyConsentChoice() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

export function writePrivacyConsent(nextConsent) {
  const consent = normalizeConsent({
    ...nextConsent,
    updatedAt: new Date().toISOString(),
  })

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
    localStorage.setItem(LEGACY_COOKIE_KEY, consent.marketing || consent.preferences ? 'accepted' : 'rejected')
    if (!consent.marketing) clearMarketingStorage()
  } catch {
    // localStorage can be blocked in private or hardened browsers.
  }

  window.dispatchEvent(new CustomEvent(PRIVACY_CONSENT_CHANGED_EVENT, { detail: consent }))
  return consent
}

export function hasMarketingConsent() {
  return readPrivacyConsent().marketing === true
}
