import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { getAdminSubscribers } from '../services/admin.js'

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'pending', label: 'Pendentes' },
]

function formatDate(value, fallback = '-') {
  if (!value) return fallback

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatValidity(subscriber) {
  if (!subscriber?.nextChargeDate) {
    return subscriber?.hasActiveAccess ? 'Sem vencimento' : '-'
  }

  return formatDate(subscriber.nextChargeDate)
}

function formatDaysUntilExpiration(subscriber) {
  const days = subscriber?.daysUntilExpiration

  if (days == null) {
    return subscriber?.hasActiveAccess ? 'Vitalicio' : '-'
  }

  if (days < 0) {
    return `${Math.abs(days)} dias vencido`
  }

  if (days === 0) {
    return 'Vence hoje'
  }

  return days === 1 ? '1 dia restante' : `${days} dias restantes`
}

function resolveStatus(subscriber) {
  if (String(subscriber?.planStatus ?? '').toLowerCase() === 'checkout pendente') {
    return 'Pendente'
  }

  return subscriber?.hasActiveAccess ? 'Ativo' : 'Vencido'
}

function StatusBadge({ subscriber }) {
  const status = resolveStatus(subscriber)
  const style =
    status === 'Ativo'
      ? undefined
      : status === 'Pendente'
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

function EmptyState({ loading }) {
  return (
    <div className="card">
      <div className="card-inner muted" style={{ textAlign: 'center' }}>
        {loading ? 'Carregando assinantes...' : 'Nenhum assinante encontrado.'}
      </div>
    </div>
  )
}

export default function AdminAssinantes() {
  const currentUser = useCurrentUser()
  const initialLoadDone = useRef(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadSubscribers = useCallback(async (nextFilters = { search: '', status: '' }) => {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminSubscribers(nextFilters)
      setData(response)
    } catch (caught) {
      const message = String(caught?.message ?? '').replace(/^API \d+:\s*/u, '').trim()
      setError(message || 'Nao foi possivel carregar os assinantes.')
    } finally {
      setLoading(false)
    }
  }, [])

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
        <SectionCard title="Acesso restrito" description="Area exclusiva para master user.">
          <Link className="btn btn-primary" to="/dashboard">
            Voltar ao dashboard
          </Link>
        </SectionCard>
      </div>
    )
  }

  const subscribers = Array.isArray(data?.subscribers) ? data.subscribers : []

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title="Assinantes"
        description="Usuarios com checkout, assinatura ativa, assinatura vencida ou pagamento pendente."
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="grid grid-4">
            <SummaryCard label="Total" value={data?.totalSubscribers ?? 0} />
            <SummaryCard label="Ativos" value={data?.activeSubscribers ?? 0} />
            <SummaryCard label="Vencidos" value={data?.expiredSubscribers ?? 0} />
            <SummaryCard label="Pendentes" value={data?.pendingSubscribers ?? 0} />
          </div>

          <form className="admin-toolbar" onSubmit={onSubmit}>
            <div className="field admin-search-field">
              <label htmlFor="subscriber-search">Buscar</label>
              <div className="admin-search-box">
                <Search size={16} aria-hidden="true" />
                <input
                  id="subscriber-search"
                  className="input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, e-mail ou plano"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="subscriber-status">Status</label>
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
                Consultar
              </button>
              <button
                className="btn btn-soft"
                type="button"
                onClick={() => loadSubscribers(filters)}
                disabled={loading}
                aria-label="Atualizar assinantes"
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
            <EmptyState loading={loading} />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Plano</th>
                    <th>Status</th>
                    <th>Valido ate</th>
                    <th>Criado em</th>
                    <th>Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{subscriber.name || 'Aluno'}</strong>
                          <span className="muted">{subscriber.email}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{subscriber.plan || '-'}</strong>
                          <span className="muted">{subscriber.planStatus || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge subscriber={subscriber} />
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{formatValidity(subscriber)}</strong>
                          <span className="muted">{formatDaysUntilExpiration(subscriber)}</span>
                        </div>
                      </td>
                      <td>{formatDateTime(subscriber.createdAt)}</td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span className="muted">Cliente</span>
                          <code>{subscriber.stripeCustomerId || '-'}</code>
                          <span className="muted">Assinatura</span>
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
