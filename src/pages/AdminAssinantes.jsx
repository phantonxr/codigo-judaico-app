import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { getAdminSubscribers } from '../services/admin.js'

function formatDate(value, fallback = '-') {
  if (!value) return fallback

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat(undefined).format(date)
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatValidity(subscriber, t) {
  if (!subscriber?.nextChargeDate) {
    return subscriber?.hasActiveAccess ? t('admin.expiration.no_expiry') : '-'
  }

  return formatDate(subscriber.nextChargeDate)
}

function formatDaysUntilExpiration(subscriber, t) {
  const days = subscriber?.daysUntilExpiration

  if (days == null) {
    return subscriber?.hasActiveAccess ? t('admin.expiration.lifetime') : '-'
  }

  if (days < 0) {
    return t('admin.expiration.days_expired', { count: Math.abs(days) })
  }

  if (days === 0) {
    return t('admin.expiration.today')
  }

  return days === 1
    ? t('admin.expiration.day_remaining')
    : t('admin.expiration.days_remaining', { count: days })
}

function resolveStatus(subscriber, t) {
  if (String(subscriber?.planStatus ?? '').toLowerCase() === 'checkout pendente') {
    return t('admin.statuses.pending')
  }

  return subscriber?.hasActiveAccess ? t('admin.statuses.active') : t('admin.statuses.expired')
}

function StatusBadge({ subscriber, t }) {
  const status = resolveStatus(subscriber, t)
  const activeLabel = t('admin.statuses.active')
  const pendingLabel = t('admin.statuses.pending')

  const style =
    status === activeLabel
      ? undefined
      : status === pendingLabel
        ? {
            borderColor: 'rgba(240, 210, 122, 0.45)',
            background: 'rgba(240, 210, 122, 0.08)',
          }
        : {
            borderColor: 'rgba(255, 77, 77, 0.45)',
            background: 'rgba(255, 77, 77, 0.08)',
            color: '#ffc8c8',
          }

  return (
    <span className="badge" style={style}>
      {status}
    </span>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="card">
      <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
        <div className="muted">{label}</div>
        <div style={{ fontWeight: 900, fontSize: 24, color: 'var(--gold-2)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ loading, t }) {
  return (
    <div className="card">
      <div className="card-inner muted" style={{ textAlign: 'center' }}>
        {loading ? t('admin.loading') : t('admin.empty')}
      </div>
    </div>
  )
}

export default function AdminAssinantes() {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const initialLoadDone = useRef(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const statusOptions = [
    { value: '', label: t('admin.status_options.all') },
    { value: 'active', label: t('admin.status_options.active') },
    { value: 'expired', label: t('admin.status_options.expired') },
    { value: 'pending', label: t('admin.status_options.pending') },
  ]

  const loadSubscribers = useCallback(async (nextFilters = { search: '', status: '' }) => {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminSubscribers(nextFilters)
      setData(response)
    } catch (caught) {
      const message = String(caught?.message ?? '').replace(/^API \d+:\s*/u, '').trim()
      setError(message || t('admin.error_load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!currentUser?.isMasterUser || initialLoadDone.current) return

    initialLoadDone.current = true
    loadSubscribers({ search: '', status: '' })
  }, [currentUser?.isMasterUser, loadSubscribers])

  function onSubmit(event) {
    event.preventDefault()
    const nextFilters = {
      search: search.trim(),
      status,
    }
    setFilters(nextFilters)
    loadSubscribers(nextFilters)
  }

  if (!currentUser?.isMasterUser) {
    return (
      <div className="container dashboard-grid">
        <SectionCard title={t('admin.restricted_title')} description={t('admin.restricted_desc')}>
          <Link className="btn btn-primary" to="/dashboard">
            {t('admin.back_to_dashboard')}
          </Link>
        </SectionCard>
      </div>
    )
  }

  const subscribers = Array.isArray(data?.subscribers) ? data.subscribers : []

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title={t('admin.title')}
        description={t('admin.description')}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="grid grid-4">
            <SummaryCard label={t('admin.summary.total')} value={data?.totalSubscribers ?? 0} />
            <SummaryCard label={t('admin.summary.active')} value={data?.activeSubscribers ?? 0} />
            <SummaryCard label={t('admin.summary.expired')} value={data?.expiredSubscribers ?? 0} />
            <SummaryCard label={t('admin.summary.pending')} value={data?.pendingSubscribers ?? 0} />
          </div>

          <form className="admin-toolbar" onSubmit={onSubmit}>
            <div className="field admin-search-field">
              <label htmlFor="subscriber-search">{t('admin.search_label')}</label>
              <div className="admin-search-box">
                <Search size={16} aria-hidden="true" />
                <input
                  id="subscriber-search"
                  className="input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.search_placeholder')}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="subscriber-status">{t('admin.status_label')}</label>
              <select
                id="subscriber-status"
                className="input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-toolbar-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Search size={16} aria-hidden="true" />
                {t('admin.consult_btn')}
              </button>
              <button
                className="btn btn-soft"
                type="button"
                onClick={() => loadSubscribers(filters)}
                disabled={loading}
                aria-label={t('common.retry')}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
          </form>

          {error ? (
            <div className="card" style={{ borderColor: 'rgba(255, 77, 77, 0.45)' }}>
              <div className="card-inner" style={{ color: '#ffc8c8' }}>
                {error}
              </div>
            </div>
          ) : null}

          {subscribers.length === 0 ? (
            <EmptyState loading={loading} t={t} />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.table.student')}</th>
                    <th>{t('admin.table.plan')}</th>
                    <th>{t('admin.table.status')}</th>
                    <th>{t('admin.table.valid_until')}</th>
                    <th>{t('admin.table.created_at')}</th>
                    <th>{t('admin.table.activity')}</th>
                    <th>{t('admin.table.stripe')}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{subscriber.name || t('admin.table.student_fallback')}</strong>
                          <span className="muted">{subscriber.email}</span>
                          {subscriber.utmSource ? (
                            <code style={{ fontSize: 11 }}>{subscriber.utmSource}</code>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{subscriber.plan || '-'}</strong>
                          <span className="muted">{subscriber.planStatus || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge subscriber={subscriber} t={t} />
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{formatValidity(subscriber, t)}</strong>
                          <span className="muted">{formatDaysUntilExpiration(subscriber, t)}</span>
                        </div>
                      </td>
                      <td>{formatDateTime(subscriber.createdAt)}</td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>
                            {subscriber.lastLoginAt
                              ? formatDateTime(subscriber.lastLoginAt)
                              : t('admin.table.never_logged')}
                          </strong>
                          <span className="muted">
                            {t('admin.table.logins_count', { count: subscriber.totalLogins })}
                          </span>
                          <span className="muted">
                            {subscriber.hasCompletedAssessment
                              ? t('admin.table.assessment_done')
                              : t('admin.table.assessment_pending')}
                          </span>
                          <span className="muted">
                            {t('admin.table.lessons_completed', { count: subscriber.lessonsCompleted })}
                            {' · '}
                            {t('admin.table.mentor_msgs', { count: subscriber.mentorMessagesCount })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span className="muted">{t('admin.table.customer')}</span>
                          <code>{subscriber.stripeCustomerId || '-'}</code>
                          <span className="muted">{t('admin.table.subscription')}</span>
                          <code>{subscriber.stripeSubscriptionId || '-'}</code>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
