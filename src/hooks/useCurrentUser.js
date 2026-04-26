import { useEffect, useState } from 'react'
import { hasAuthToken } from '../services/authStorage.js'
import {
  clearSessionCache,
  loginWithPassword,
  logoutCurrentSession,
  readStoredCurrentUser,
  refreshCurrentSession,
} from '../services/sessionSync.js'

export function readCurrentUser() {
  const cached = readStoredCurrentUser()
  return {
    id: cached.id,
    name: cached.name || 'Aluno',
    email: cached.email,
    plan: cached.plan,
    planStatus: cached.planStatus,
    nextChargeDate: cached.nextChargeDate,
    hasActiveAccess: cached.hasActiveAccess,
    isMasterUser: cached.isMasterUser,
    hasCompletedAssessment: cached.hasCompletedAssessment,
  }
}

export async function signInUser({ email, password }) {
  await loginWithPassword({ email, password })
  return readCurrentUser()
}

export async function signOutUser() {
  await logoutCurrentSession()
  return readCurrentUser()
}

export default function useCurrentUser() {
  const [user, setUser] = useState(() => readCurrentUser())

  useEffect(() => {
    const onUpdate = () => setUser(readCurrentUser())
    const onInvalid = () => clearSessionCache()
    window.addEventListener('storage', onUpdate)
    window.addEventListener('auth_user_updated', onUpdate)
    window.addEventListener('auth_session_invalid', onInvalid)
    return () => {
      window.removeEventListener('storage', onUpdate)
      window.removeEventListener('auth_user_updated', onUpdate)
      window.removeEventListener('auth_session_invalid', onInvalid)
    }
  }, [])

  useEffect(() => {
    if (!hasAuthToken()) return

    refreshCurrentSession().catch(() => {
      clearSessionCache()
    })
  }, [])

  return user
}
