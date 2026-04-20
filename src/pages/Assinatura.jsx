import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { getAvailablePlans } from '../services/payments.js'

function buildUpgradeLink(planId, email) {
  const params = new URLSearchParams({ plan: planId, reason: 'payment_required' })
  if (email) params.set('email', email)
  return `/checkout?${params.toString()}`
}

function PlanUpgradeCard({ plan, email }) {
  return (
    <div
      className="card"
      style={plan.isHighlighted ? { borderColor: 'rgba(215, 178, 74, 0.65)' } : undefined}
    >
      <div
        className="card-inner"
        style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{plan.name}</div>
            <div className="muted">{plan.description}</div>
          </div>
          {plan.isHighlighted ? <span className="badge">Oferta unica</span> : null}
        </div>

        <div>
          <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 22 }}>{plan.price}</div>
          <div className="muted">{plan.period}</div>
        </div>

        <Link
          className={`btn btn-block${plan.isHighlighted ? ' btn-primary' : ''}`}
          style={{ marginTop: 'auto' }}
          to={buildUpgradeLink(plan.id, email)}
        >
          {plan.isHighlighted ? 'Aproveitar oferta' : `Assinar ${plan.name}`}
        </Link>
      </div>
    </div>
  )
}

export default function Assinatura() {
  const currentUser = useCurrentUser()
  const planName = currentUser?.plan || '-'
  const planStatus = currentUser?.planStatus || (planName && planName !== '-' ? 'Ativo' : '-')
  const nextChargeDate = currentUser?.nextChargeDate || '-'
  const hasActiveAccess = currentUser?.hasActiveAccess !== false
  const [availablePlans, setAvailablePlans] = useState([])

  useEffect(() => {
    getAvailablePlans()
      .then((plans) => setAvailablePlans(plans ?? []))
      .catch(() => setAvailablePlans([]))
  }, [])

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title="Plano atual"
        description="Status e beneficios liberados pela assinatura no Stripe."
      >
        <div style={{ display: 'grid', gap: 18 }}>
          {!hasActiveAccess ? (
            <div
              className="card"
              style={{
                borderColor: 'rgba(215, 178, 74, 0.6)',
                background: 'linear-gradient(180deg, rgba(215, 178, 74, 0.08), rgba(255,255,255,0.02))',
              }}
            >
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <span className="badge" style={{ width: 'fit-content' }}>Volte para a jornada</span>
                <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
                  Sua assinatura precisa ser renovada para liberar novamente todo o metodo
                </div>
                <div className="muted" style={{ lineHeight: 1.7 }}>
                  Escolha uma das opcoes abaixo para voltar a acessar o Rabino Mentor, os desafios,
                  a biblioteca e o acompanhamento completo da jornada.
                </div>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div
              className="card-inner"
              style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Plano atual</div>
                  <div className="muted">{planName}</div>
                </div>
                <span className="badge">{planStatus}</span>
              </div>

              <div className="grid grid-2">
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                    <div className="muted">Valor</div>
                    <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>Conforme plano ativo</div>
                  </div>
                </div>
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                    <div className="muted">Valido ate</div>
                    <div style={{ fontWeight: 900 }}>{nextChargeDate}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>
                  {hasActiveAccess ? 'Beneficios liberados' : 'O que sera liberado ao renovar'}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.82)' }}>
                  <li>Rabino Mentor (chat guiado)</li>
                  <li>Biblioteca de ensinamentos</li>
                  <li>Desafios interativos</li>
                  <li>Progresso e streak</li>
                </ul>
              </div>
            </div>
          </div>

          {availablePlans.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {hasActiveAccess ? 'Opcoes de plano' : 'Escolha sua renovacao'}
              </div>
              <div className="subscription-grid">
                {availablePlans.map((plan) => (
                  <PlanUpgradeCard key={plan.id} plan={plan} email={currentUser?.email} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
