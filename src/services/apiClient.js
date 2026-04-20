import { clearAuthToken, readAuthToken } from './authStorage.js'

function safeTrim(text) {
  return String(text ?? '').trim()
}

function normalizeBase(base) {
  const value = safeTrim(base)
  if (!value) return ''
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function readValidationMessage(payload) {
  const errors = payload?.errors

  if (!errors || typeof errors !== 'object') {
    return ''
  }

  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      return safeTrim(messages[0])
    }
  }

  return ''
}

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = normalizeBase(import.meta.env.VITE_API_BASE_URL)
  return base ? `${base}${normalizedPath}` : normalizedPath
}

export async function apiFetch(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const token = readAuthToken()

  const init = {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  }

  if (token && !init.headers.Authorization) {
    init.headers.Authorization = `Bearer ${token}`
  }

  if (init.body !== undefined && !init.headers['Content-Type']) {
    init.headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(buildApiUrl(normalizedPath), init)

  if (res.status === 401 && !normalizedPath.startsWith('/api/auth/login')) {
    clearAuthToken()
    window.dispatchEvent(new Event('auth_session_invalid'))
  }

  if (!res.ok) {
    const contentType = String(res.headers.get('content-type') ?? '')
    let payload = null
    let message = ''

    if (contentType.includes('application/json')) {
      payload = await res.json().catch(() => null)
      message =
        readValidationMessage(payload) ||
        safeTrim(payload?.detail) ||
        safeTrim(payload?.message) ||
        safeTrim(payload?.title)
    } else {
      message = await res.text().catch(() => '')
    }

    if (res.status === 403 && payload?.code === 'subscription_required') {
      window.dispatchEvent(
        new CustomEvent('subscription_required', {
          detail: payload,
        }),
      )
    }

    const error = new Error(
      `API ${res.status}: ${message || res.statusText}`.trim(),
    )
    error.status = res.status
    error.data = payload
    throw error
  }

  if (res.status === 204) return null

  const contentType = String(res.headers.get('content-type') ?? '')
  if (contentType.includes('application/json')) {
    return res.json()
  }

  return res.text()
}
