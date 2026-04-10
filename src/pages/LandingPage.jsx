import { Link } from 'react-router-dom'
import { KIRVANO_URL } from '../data/offers.js'

export default function LandingPage() {
  return (
    <div>
      <div className="container">
        <section className="hero">
          <span className="badge">Método Judaico • Rabino Mentor IA</span>
          <h1>Código Judaico da Prosperidade</h1>
          <p>
            Uma experiência premium de autoconhecimento financeiro, decisões melhores e
            execução consistente — com um mentor guiando sua jornada.
          </p>
          <div className="hero-actions">
            <a
              className="btn btn-primary"
              href={KIRVANO_URL}
              target="_blank"
              rel="noreferrer"
            >
              Quero acessar agora
            </a>
            <Link className="btn" to="/login">
              Já tenho conta (Login)
            </Link>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Benefícios</h2>
          <p className="section-sub">
            Clareza, método e progresso real — sem promessas vazias.
          </p>
          <div className="grid grid-3">
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>
                  Direção
                </div>
                <div className="muted">
                  Rotina financeira simples para você não depender de motivação.
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>
                  Mentoria
                </div>
                <div className="muted">
                  Rabino Mentor IA para orientar decisões e próximos passos.
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>
                  Execução
                </div>
                <div className="muted">
                  Desafios curtos para gerar ação e resultados em poucas semanas.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Por que é diferente?</h2>
          <p className="section-sub">
            Um produto pensado como SaaS premium: visão, trilhas e integração com
            pagamento.
          </p>
          <div className="grid grid-2">
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>Arquitetura escalável</div>
                <div className="muted">
                  Componentes e dados mockados prontos para plugar IA e backend.
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>Pronto para deploy</div>
                <div className="muted">
                  Vite + Router com configuração de SPA para Vercel.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingBottom: 56 }}>
          <div className="card">
            <div
              className="card-inner"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                Pronto para começar a sua jornada?
              </div>
              <div className="muted">
                Acesse a oferta oficial e desbloqueie o plano premium.
              </div>
              <a
                className="btn btn-primary"
                href={KIRVANO_URL}
                target="_blank"
                rel="noreferrer"
              >
                Ir para a Kirvano
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
