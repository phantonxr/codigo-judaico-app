import SectionCard from '../components/SectionCard.jsx'
import { KIRVANO_URL } from '../data/offers.js'
import useCurrentUser from '../hooks/useCurrentUser.js'

const annualBenefits = [
  'Comunidade Premium (grupo fechado)',
  'Conteúdos exclusivos',
  'Mentoria ao vivo',
  'Acesso a eventos ao vivo',
  'Ensinamentos diários',
  'Desafios em grupo',
  'Biblioteca avançada',
  'Networking de membros',
  'Templates premium',
]

export default function Assinatura() {
  const currentUser = useCurrentUser()
  const planName = currentUser?.plan || '—'
  const planStatus = planName && planName !== '—' ? 'Ativo' : '—'
  const nextChargeDate = '—'

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title="Plano atual"
        description="Status e benefícios liberados (mockado)."
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
                    <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>R$27,90</div>
                  </div>
                </div>
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                    <div className="muted">Próxima cobrança</div>
                    <div style={{ fontWeight: 900 }}>{nextChargeDate}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>Benefícios liberados</div>
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
                    Comunidade Código Judaico Premium
                  </div>
                  <div className="muted">Upgrade para anual</div>
                </div>
                <span className="badge">R$997/ano</span>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 22 }}>
                  R$997 / ano
                </div>
                <div className="muted">Acesso premium por 12 meses</div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>O que inclui</div>
                <div className="grid grid-2">
                  {annualBenefits.map((b) => (
                    <div key={b} className="badge" style={{ justifyContent: 'flex-start' }}>
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              <a
                className="btn btn-primary btn-block"
                style={{ marginTop: 'auto' }}
                href={KIRVANO_URL}
                target="_blank"
                rel="noreferrer"
              >
                Fazer upgrade anual
              </a>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
