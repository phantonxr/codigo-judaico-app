import { apiFetch } from './apiClient.js'

function safeTrim(text) {
  return String(text ?? '').trim()
}

export async function getAdminSubscribers({ search = '', status = '' } = {}) {
  const params = new URLSearchParams()
  const normalizedSearch = safeTrim(search)
  const normalizedStatus = safeTrim(status)

  if (normalizedSearch) {
    params.set('search', normalizedSearch)
  }

  if (normalizedStatus) {
    params.set('status', normalizedStatus)
  }

  const query = params.toString()
  return apiFetch(`/api/admin/subscribers${query ? `?${query}` : ''}`)
}
