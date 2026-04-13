import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { computeDailyStreak, computeWeeklyProgressPct } from '../utils/progress.js'

function clampPct(value) {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export default function Topbar({ title }) {
  const currentUser = useCurrentUser()
  const greetingName = currentUser?.name || 'Aluno'

  const initials = useMemo(() => {
    const name = String(currentUser?.name ?? '').trim()
    if (!name) return 'CJ'
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? 'C'
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : 'J'
    return `${String(first).toUpperCase()}${String(last).toUpperCase()}`
  }, [currentUser?.name])

  const [streakDays, setStreakDays] = useState(0)
  const [weeklyPctRaw, setWeeklyPctRaw] = useState(0)

  useEffect(() => {
    const email = currentUser?.email
    const recompute = () => {
      setStreakDays(computeDailyStreak(email))
      setWeeklyPctRaw(computeWeeklyProgressPct(email))
    }
    recompute()
    window.addEventListener('daily_action_updated', recompute)
    window.addEventListener('auth_user_updated', recompute)
    return () => {
      window.removeEventListener('daily_action_updated', recompute)
      window.removeEventListener('auth_user_updated', recompute)
    }
  }, [currentUser?.email])

  const weeklyPct = clampPct(weeklyPctRaw)

  return (
    <header className="topbar" role="banner">
      <div className="topbar-inner">
        <div className="topbar-left">
          <div className="topbar-greeting">
            <div className="topbar-hello">Shalom, {greetingName}</div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-stats" aria-label="Indicadores">
            <div className="stat-pill">
              <span className="stat-label">Streak</span>
              <span className="stat-value">{streakDays} dias</span>
            </div>
            <div className="stat-pill" aria-label="Progresso semanal">
              <span className="stat-label">Semana</span>
              <span className="stat-value">{weeklyPct}%</span>
              <span className="mini-bar" aria-hidden="true">
                <span className="mini-bar-fill" style={{ width: `${weeklyPct}%` }} />
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="icon-btn" type="button" aria-label="Notificações">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5L3.6 17.4V19h16.8v-1.6L19 16Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Link className="icon-btn" to="/mais" aria-label="Perfil">
            <span className="avatar avatar-sm" aria-hidden="true">
              {initials}
            </span>
          </Link>
          <Link className="btn btn-soft" to="/login">
            Trocar conta
          </Link>
        </div>
      </div>
    </header>
  )
}
