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
  const init = {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  }

  if (init.body !== undefined && !init.headers['Content-Type']) {
    init.headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(buildApiUrl(path), init)

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
