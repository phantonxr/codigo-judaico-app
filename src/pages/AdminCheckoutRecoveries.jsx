import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { getAdminCheckoutRecoveries } from '../services/admin.js'

function formatDateTime(value) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function EmailStatusCell({ sentAt, openedAt, t }) {
  if (!sentAt) {
    return <span className="muted">{t('admin.recovery.email.not_sent')}</span>
  }

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span>✉ {formatDateTime(sentAt)}</span>
      {openedAt ? (
        <span style={{ color: 'var(--gold-2)', fontSize: 12 }}>
          👁 {formatDateTime(openedAt)}
        </span>
      ) : (
        <span className="muted" style={{ fontSize: 12 }}>
          {t('admin.recovery.email.not_opened')}
        </span>
      )}
    </div>
  )
}

function StatusBadge({ status, t }) {
  const label = t(`admin.recovery.statuses.${status}`, status)

  const style =
    status === 'completed'
      ? { borderColor: 'rgba(80, 200, 120, 0.45)', background: 'rgba(80, 200, 120, 0.08)', color: '#a8f0c0' }
      : status === 'pending'
        ? { borderColor: 'rgba(240, 210, 122, 0.45)', background: 'rgba(240, 210, 122, 0.08)' }
        : status === 'stopped'
          ? { borderColor: 'rgba(255, 77, 77, 0.45)', background: 'rgba(255, 77, 77, 0.08)', color: '#ffc8c8' }
          : undefined

  return <span className="badge" style={style}>{label}</span>
}

function StopReasonBadge({ reason, t }) {
  if (!reason) return <span className="muted">—</span>

  return (
    <span className="muted" style={{ fontSize: 12 }}>
      {t(`admin.recovery.stop_reasons.${reason}`, reason)}
    </span>
  )
}

export default function AdminCheckoutRecoveries() {
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
    { value: '', label: t('admin.recovery.status_options.all') },
    { value: 'pending', label: t('admin.recovery.status_options.pending') },
    { value: 'sequence_completed', label: t('admin.recovery.status_options.sequence_completed') },
    { value: 'completed', label: t('admin.recovery.status_options.completed') },
    { value: 'stopped', label: t('admin.recovery.status_options.stopped') },
  ]

  const loadRecoveries = useCallback(async (nextFilters = { search: '', status: '' }) => {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminCheckoutRecoveries(nextFilters)
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
    loadRecoveries({ search: '', status: '' })
  }, [currentUser?.isMasterUser, loadRecoveries])

  function onSubmit(event) {
    event.preventDefault()
    const nextFilters = { search: search.trim(), status }
    setFilters(nextFilters)
    loadRecoveries(nextFilters)
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

  const items = Array.isArray(data?.items) ? data.items : []

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title={t('admin.recovery.title')}
        description={t('admin.recovery.description')}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <form className="admin-toolbar" onSubmit={onSubmit}>
            <div className="field admin-search-field">
              <label htmlFor="recovery-search">{t('admin.search_label')}</label>
              <div className="admin-search-box">
                <Search size={16} aria-hidden="true" />
                <input
                  id="recovery-search"
                  className="input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.search_placeholder')}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="recovery-status">{t('admin.status_label')}</label>
              <select
                id="recovery-status"
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
                onClick={() => loadRecoveries(filters)}
                disabled={loading}
                aria-label={t('common.retry')}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
          </form>

          {error ? (
            <div className="card" style={{ borderColor: 'rgba(255, 77, 77, 0.45)' }}>
              <div className="card-inner" style={{ color: '#ffc8c8' }}>{error}</div>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="card">
              <div className="card-inner muted" style={{ textAlign: 'center' }}>
                {loading ? t('admin.loading') : t('admin.recovery.empty')}
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.recovery.table.student')}</th>
                    <th>{t('admin.recovery.table.plan')}</th>
                    <th>{t('admin.recovery.table.status')}</th>
                    <th>{t('admin.recovery.table.persuasive')}</th>
                    <th>{t('admin.recovery.table.discount')}</th>
                    <th>{t('admin.recovery.table.created_at')}</th>
                    <th>{t('admin.recovery.table.stop_reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{item.userName || t('admin.table.student_fallback')}</strong>
                          <span className="muted">{item.email}</span>
                        </div>
                      </td>
                      <td>{item.planName || '—'}</td>
                      <td>
                        <StatusBadge status={item.status} t={t} />
                      </td>
                      <td>
                        <EmailStatusCell
                          sentAt={item.persuasiveEmailSentAt}
                          openedAt={item.persuasiveEmailOpenedAt}
                          t={t}
                        />
                      </td>
                      <td>
                        <EmailStatusCell
                          sentAt={item.discountEmailSentAt}
                          openedAt={item.discountEmailOpenedAt}
                          t={t}
                        />
                      </td>
                      <td>{formatDateTime(item.createdAt) ?? '—'}</td>
                      <td>
                        <StopReasonBadge reason={item.stopReason} t={t} />
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
