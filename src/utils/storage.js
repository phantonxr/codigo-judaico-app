const PREFIX = 'cj_prosperidade_v1'

function key(name) {
  return `${PREFIX}:${name}`
}

export function readJson(name, fallback) {
  try {
    const raw = localStorage.getItem(key(name))
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function remove(name) {
  try {
    localStorage.removeItem(key(name))
  } catch {
    // ignore
  }
}

export function mergeJson(name, partial, fallback) {
  const current = readJson(name, fallback)
  const next = { ...(current ?? {}), ...(partial ?? {}) }
  try {
    localStorage.setItem(key(name), JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

// TODO: persistir progresso por usuário (quando houver auth)
