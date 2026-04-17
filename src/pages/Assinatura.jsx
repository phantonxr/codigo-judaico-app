import { Link } from 'react-router-dom'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'

const annualBenefits = [
  'Comunidade Premium (grupo fechado)',
  'Conteudos exclusivos',
  'Mentoria ao vivo',
  'Acesso a eventos ao vivo',
  'Ensinamentos diarios',
  'Desafios em grupo',
  'Biblioteca avancada',
  'Networking de membros',
  'Templates premium',
]

export default function Assinatura() {
  const currentUser = useCurrentUser()
  const planName = currentUser?.plan || '-'
  const planStatus = currentUser?.planStatus || (planName && planName !== '-' ? 'Ativo' : '-')
  const nextChargeDate = currentUser?.nextChargeDate || '-'

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title="Plano atual"
        description="Status e beneficios liberados pela assinatura no Stripe."
      >
        <div className="subscription-grid">
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
                    <div className="muted">Proxima cobranca</div>
                    <div style={{ fontWeight: 900 }}>{nextChargeDate}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>Beneficios liberados</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.82)' }}>
                  <li>Rabino Mentor (chat guiado)</li>
                  <li>Biblioteca de ensinamentos</li>
                  <li>Desafios interativos</li>
                  <li>Progresso e streak</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.45)' }}>
            <div
              className="card-inner"
              style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    Comunidade Codigo Judaico Premium
                  </div>
                  <div className="muted">Upgrade para anual</div>
                </div>
                <span className="badge">R$297/ano</span>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 22 }}>
                  R$297 / ano
                </div>
                <div className="muted">Acesso premium por 12 meses</div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>O que inclui</div>
                <div className="grid grid-2">
                  {annualBenefits.map((benefit) => (
                    <div key={benefit} className="badge" style={{ justifyContent: 'flex-start' }}>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <Link
                className="btn btn-primary btn-block"
                style={{ marginTop: 'auto' }}
                to="/checkout?plan=anual"
              >
                Fazer upgrade anual
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
