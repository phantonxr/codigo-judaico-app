import { apiFetch } from './apiClient.js'

function safeTrim(value) {
  return String(value ?? '').trim()
}

export function exportPrivacyData(userId) {
  const normalized = safeTrim(userId)
  if (!normalized) {
    throw new Error('User id is required to export privacy data.')
  }

  return apiFetch(`/api/users/${encodeURIComponent(normalized)}/privacy/export`)
}

export function deletePrivacyAccount(userId, email) {
  const normalized = safeTrim(userId)
  if (!normalized) {
    throw new Error('User id is required to delete privacy data.')
  }

  return apiFetch(`/api/users/${encodeURIComponent(normalized)}/privacy/account-deletion`, {
    method: 'POST',
    body: JSON.stringify({ email: safeTrim(email) }),
  })
}

export function optOutMarketingData(userId) {
  const normalized = safeTrim(userId)
  if (!normalized) {
    throw new Error('User id is required to update privacy preferences.')
  }

  return apiFetch(`/api/users/${encodeURIComponent(normalized)}/privacy/marketing-opt-out`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
