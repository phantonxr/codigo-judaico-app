import { useEffect, useState } from 'react'

const NAME_KEY = 'auth_user_name'
const EMAIL_KEY = 'auth_user_email'
const PLAN_KEY = 'auth_user_plan'

export function readCurrentUser() {
  const name = String(localStorage.getItem(NAME_KEY) ?? '').trim() || 'Aluno'
  const email = String(localStorage.getItem(EMAIL_KEY) ?? '').trim()
  const plan = String(localStorage.getItem(PLAN_KEY) ?? '').trim()
  return { name, email, plan }
}

export function saveCurrentUser({ name, email, plan }) {
  localStorage.setItem(NAME_KEY, String(name ?? '').trim())
  localStorage.setItem(EMAIL_KEY, String(email ?? '').trim())
  localStorage.setItem(PLAN_KEY, String(plan ?? '').trim())
  window.dispatchEvent(new Event('auth_user_updated'))
}

// TODO: migrar auth para Supabase
export default function useCurrentUser() {
  const [user, setUser] = useState(() => readCurrentUser())

  useEffect(() => {
    const onUpdate = () => setUser(readCurrentUser())
    window.addEventListener('storage', onUpdate)
    window.addEventListener('auth_user_updated', onUpdate)
    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener('auth_user_updated', onUpdate)
    }
  }, [])

  return user
}
