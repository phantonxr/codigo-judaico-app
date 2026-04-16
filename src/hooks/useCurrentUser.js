import { useEffect, useState } from 'react'
import { bootstrapSession, readStoredCurrentUser } from '../services/sessionSync.js'

const ID_KEY = 'auth_user_id'
const NAME_KEY = 'auth_user_name'
const EMAIL_KEY = 'auth_user_email'
const PLAN_KEY = 'auth_user_plan'
const PLAN_STATUS_KEY = 'auth_user_plan_status'
const NEXT_CHARGE_DATE_KEY = 'auth_user_next_charge_date'

export function readCurrentUser() {
  const cached = readStoredCurrentUser()
  return {
    id: cached.id,
    name: cached.name || 'Aluno',
    email: cached.email,
    plan: cached.plan,
    planStatus: cached.planStatus,
    nextChargeDate: cached.nextChargeDate,
  }
}

export async function saveCurrentUser({ name, email, plan }) {
  localStorage.setItem(ID_KEY, String(localStorage.getItem(ID_KEY) ?? '').trim())
  localStorage.setItem(NAME_KEY, String(name ?? '').trim())
  localStorage.setItem(EMAIL_KEY, String(email ?? '').trim())
  localStorage.setItem(PLAN_KEY, String(plan ?? '').trim())
  localStorage.setItem(PLAN_STATUS_KEY, String(localStorage.getItem(PLAN_STATUS_KEY) ?? '').trim())
  localStorage.setItem(NEXT_CHARGE_DATE_KEY, String(localStorage.getItem(NEXT_CHARGE_DATE_KEY) ?? '').trim())
  window.dispatchEvent(new Event('auth_user_updated'))

  try {
    await bootstrapSession({ name, email, plan })
  } catch {
    // Keep the local cache as a fallback when the backend is unavailable.
  }

  return readCurrentUser()
}

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

  useEffect(() => {
    const current = readCurrentUser()
    if (!current.email) return

    bootstrapSession(current).catch(() => {
      // Keep the local cache and UI working even if the API is unavailable.
    })
  }, [])

  return user
}
