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
