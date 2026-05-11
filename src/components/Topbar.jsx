import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useCurrentUser, { signOutUser } from '../hooks/useCurrentUser.js'
import { computeDailyStreak, computeWeeklyProgressPct } from '../utils/progress.js'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function clampPct(value) {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export default function Topbar({ title, onMenuToggle = function () {} }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const greetingName = currentUser?.name || t('common.student_fallback')

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

  async function onLogout() {
    await signOutUser()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar" role="banner">
      <div className="topbar-inner">
        <div className="topbar-left">
          <button
            className="icon-btn topbar-menu-btn"
            type="button"
            aria-label={t('common.open_menu')}
            onClick={onMenuToggle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <Link className="topbar-brand" to="/dashboard" aria-label={t('common.go_to_dashboard')}>
            {t('brand.name')}
          </Link>
          <div className="topbar-greeting">
            <div className="topbar-hello">{t('topbar.greeting', { name: greetingName })}</div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-stats" aria-label={t('common.notifications')}>
            <div className="stat-pill">
              <span className="stat-label">{t('topbar.streak_label')}</span>
              <span className="stat-value">{t('topbar.streak_value', { count: streakDays })}</span>
            </div>
            <div className="stat-pill" aria-label={t('topbar.week_label')}>
              <span className="stat-label">{t('topbar.week_label')}</span>
              <span className="stat-value">{weeklyPct}%</span>
              <span className="mini-bar" aria-hidden="true">
                <span className="mini-bar-fill" style={{ width: `${weeklyPct}%` }} />
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <LanguageSwitcher className="topbar-language" />
          <button className="icon-btn topbar-notifications" type="button" aria-label={t('common.notifications')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5L3.6 17.4V19h16.8v-1.6L19 16Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Link className="icon-btn" to="/mais" aria-label={t('common.profile')}>
            <span className="avatar avatar-sm" aria-hidden="true">
              {initials}
            </span>
          </Link>
          <button className="btn btn-soft topbar-logout" type="button" onClick={onLogout}>
            {t('common.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}
