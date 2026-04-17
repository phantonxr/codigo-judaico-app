import { clearAuthToken, readAuthToken } from './authStorage.js'

function safeTrim(text) {
  return String(text ?? '').trim()
}

function normalizeBase(base) {
  const value = safeTrim(base)
  if (!value) return ''
  return value.endsWith('/') ? value.slice(0, -1) : value
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
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`.trim())
  }

  if (res.status === 204) return null

  const contentType = String(res.headers.get('content-type') ?? '')
  if (contentType.includes('application/json')) {
    return res.json()
  }

  return res.text()
}
