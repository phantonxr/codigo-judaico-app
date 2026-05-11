import { NavLink, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../hooks/useCurrentUser.js'

export default function Sidebar({ open = false, onClose = function () {} }) {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const name = currentUser?.name || t('common.user_profile')
  const plan = currentUser?.plan || '-'
  const hasActiveAccess = currentUser?.hasActiveAccess !== false
  const initials = (name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CJ')

  const navItems = [
    { key: 'dashboard', to: '/dashboard' },
    { key: 'assessment', to: '/avaliacao' },
    { key: 'mentor', to: '/mentor' },
    { key: 'challenges', to: '/desafios' },
    { key: 'calendar', to: '/calendario' },
    { key: 'library', to: '/biblioteca' },
    { key: 'books', to: '/livros' },
    { key: 'more', to: '/mais' },
    { key: 'subscription', to: '/assinatura' },
  ]

  const masterNavItems = [
    { key: 'subscribers', to: '/admin/assinantes' },
    { key: 'checkout_recoveries', to: '/admin/checkout-recoveries' },
    { key: 'legal', to: '/admin/legal' },
  ]

  const visibleNavItems = currentUser?.isMasterUser
    ? [...navItems, ...masterNavItems]
    : navItems

  return (
    <>
      <div
        className={'sidebar-overlay' + (open ? ' sidebar-overlay--open' : '')}
        role="presentation"
        onClick={onClose}
      />
      <aside className={'sidebar' + (open ? ' sidebar--open' : '')} aria-label={t('common.navigation')}>
        <div className="sidebar-inner">
        <Link to="/" className="brand" aria-label={t('common.go_to_landing')} onClick={onClose}>
          <div className="brand-mark" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2l2.2 6.8H21l-5.6 4.1 2.1 6.9L12 16.9 6.5 19.8l2.1-6.9L3 8.8h6.8L12 2z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brand-text">
            <strong>{t('brand.name')}</strong>
            <span>{t('brand.tagline')}</span>
          </div>
        </Link>
        <nav className="nav" aria-label={t('common.navigation')}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={onClose}
            >
              {t('nav.' + item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" aria-label={t('common.user_profile')}>
          <div className="mini-profile">
            <div className="avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="mini-profile-text">
              <div className="mini-name">{name}</div>
              <div className="mini-meta">
                {hasActiveAccess ? t('sidebar.plan_label', { plan }) : t('sidebar.renew')}
              </div>
            </div>
          </div>
        </div>
        </div>
      </aside>
    </>
  )
}
