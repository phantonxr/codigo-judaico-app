import { apiFetch } from './apiClient.js'

export const LEGAL_DOCUMENT_TYPES = ['terms', 'privacy', 'disclaimer']
export const LEGAL_LANGUAGES = ['pt-BR', 'en']

function safeTrim(value) {
  return String(value ?? '').trim()
}

export function normalizeLegalLanguage(language) {
  const cleaned = safeTrim(language).toLowerCase()
  if (cleaned === 'pt' || cleaned === 'pt-br' || cleaned === 'pt_br') return 'pt-BR'
  return 'en'
}

export function getLegalDocumentLabel(type) {
  const normalized = safeTrim(type).toLowerCase()
  if (normalized === 'terms') return 'Terms of Service'
  if (normalized === 'privacy') return 'Privacy Policy'
  if (normalized === 'disclaimer') return 'Disclaimer'
  return type
}

export function findLegalDocument(documents, type) {
  return (Array.isArray(documents) ? documents : []).find((document) => document.type === type) ?? null
}

export function getActiveLegalDocuments(language) {
  const params = new URLSearchParams({
    language: normalizeLegalLanguage(language),
  })
  return apiFetch(`/api/legal/active?${params.toString()}`)
}

export function getLegalAcceptanceStatus(language) {
  const params = new URLSearchParams({
    language: normalizeLegalLanguage(language),
  })
  return apiFetch(`/api/legal/status?${params.toString()}`)
}

export function acceptLegalDocuments({ activeVersions, language }) {
  return apiFetch('/api/legal/acceptance', {
    method: 'POST',
    body: JSON.stringify(buildLegalAcceptancePayload(activeVersions, language)),
  })
}

export function buildLegalAcceptancePayload(activeVersions, language) {
  return {
    termsVersion: safeTrim(activeVersions?.termsVersion),
    privacyVersion: safeTrim(activeVersions?.privacyVersion),
    disclaimerVersion: safeTrim(activeVersions?.disclaimerVersion),
    language: normalizeLegalLanguage(language),
  }
}

export function listAdminLegalDocuments({ type = '', language = '' } = {}) {
  const params = new URLSearchParams()
  if (safeTrim(type)) params.set('type', safeTrim(type))
  if (safeTrim(language)) params.set('language', normalizeLegalLanguage(language))
  const query = params.toString()
  return apiFetch(`/api/admin/legal/documents${query ? `?${query}` : ''}`)
}

export function saveAdminLegalDocument(payload) {
  return apiFetch('/api/admin/legal/documents', {
    method: 'POST',
    body: JSON.stringify({
      type: safeTrim(payload?.type),
      language: normalizeLegalLanguage(payload?.language),
      version: safeTrim(payload?.version),
      title: safeTrim(payload?.title),
      content: safeTrim(payload?.content),
      isActive: Boolean(payload?.isActive),
    }),
  })
}

export function setAdminLegalDocumentStatus(id, isActive) {
  return apiFetch(`/api/admin/legal/documents/${encodeURIComponent(String(id))}/status`, {
    method: 'PUT',
    body: JSON.stringify({ isActive: Boolean(isActive) }),
  })
}
