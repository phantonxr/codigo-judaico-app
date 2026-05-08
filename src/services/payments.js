import { apiFetch } from './apiClient.js'

export function createCheckoutSession(payload) {
  return apiFetch('/api/payments/checkout-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCheckoutSessionStatus(sessionId) {
  return apiFetch(`/api/payments/checkout-sessions/${encodeURIComponent(String(sessionId ?? ''))}`)
}

export function getAvailablePlans() {
  return apiFetch('/api/payments/available-plans')
}

export function createMentorUnlimitedCheckoutSession() {
  return apiFetch('/api/payments/mentor-unlimited/checkout-sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function postMetaLeadEvent(payload) {
  return apiFetch('/api/payments/meta/lead-event', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
