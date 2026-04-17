const AUTH_TOKEN_KEY = 'auth_session_token'

function safeTrim(value) {
  return String(value ?? '').trim()
}

export function readAuthToken() {
  try {
    return safeTrim(localStorage.getItem(AUTH_TOKEN_KEY))
  } catch {
    return ''
  }
}

export function writeAuthToken(token) {
  try {
    const next = safeTrim(token)
    if (!next) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      return
    }

    localStorage.setItem(AUTH_TOKEN_KEY, next)
  } catch {
    // ignore
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // ignore
  }
}

export function hasAuthToken() {
  return Boolean(readAuthToken())
}
