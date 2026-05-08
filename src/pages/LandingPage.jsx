import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, Crown, Sprout, Star, Compass, BookOpen, Target, Award } from 'lucide-react'

var PHASE_ICONS = [Flame, Crown, Sprout, Star]
var BENEFIT_ICONS = [Compass, BookOpen, Target, Award]

export default function LandingPage() {
  const { t } = useTranslation()

  const phases = t('landing.phases', { returnObjects: true })
  const benefits = t('landing.benefits', { returnObjects: true })

  useEffect(function () {
    var nodes = Array.from(document.querySelectorAll('[data-phase-card]'))
    if (!nodes.length) return

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      nodes.forEach(function (el) { el.classList.add('is-visible') })
      return
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { root: null, rootMargin: '0px 0px -15% 0px', threshold: 0.22 }
    )

    nodes.forEach(function (el) { observer.observe(el) })
    return function () { observer.disconnect() }
  }, [])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Código Judaico da Prosperidade',
        url: 'https://www.codigomilenarjudaico.com',
        logo: 'https://www.codigomilenarjudaico.com/og-image.svg',
        contactPoint: { '@type': 'ContactPoint', email: 'privacidade@codigomilenarjudaico.com' },
      },
      {
        '@type': 'Course',
        name: 'Código Judaico da Prosperidade',
        description: 'Método milenar judaico de 4 fases e 21 dias para construir prosperidade financeira, disciplina emocional e legado.',
        provider: { '@type': 'Organization', name: 'Código Judaico da Prosperidade' },
        url: 'https://www.codigomilenarjudaico.com',
        offers: [
          { '@type': 'Offer', name: 'Primeiro Acesso', price: '29.90', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: 'Premium Mensal', price: '37.90', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: 'Premium Anual', price: '297.90', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: 'Acesso Vitalício', price: '497.90', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
        ],
      },
    ],
  }

  return (
    <div className="landing-wrapper">
      <title>Código Judaico da Prosperidade — Método Milenar de 21 Dias</title>
      <meta name="description" content="Descubra o método milenar judaico de 21 dias para prosperidade financeira. 4 fases práticas, desafios diários, biblioteca e Mentor IA. Transforme sua relação com o dinheiro." />
      <link rel="canonical" href="https://www.codigomilenarjudaico.com/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        /* Landing-only overrides (mantém mudanças restritas à home) */
        .landing-wrapper .landing-hero {
          max-width: 1040px; /* entre 900px e 1100px */
          margin: 0 auto;
          text-align: center;
          padding: 84px 0 44px;
        }

        .landing-wrapper .landing-headline {
          margin-left: auto;
          margin-right: auto;
        }

        .landing-wrapper .landing-subheadline {
          max-width: 760px; /* mais estreita que a headline */
          margin-left: auto;
          margin-right: auto;
          margin-bottom: 0;
          font-size: 17px;
          line-height: 1.9;
        }

        .landing-wrapper .hero-actions {
          justify-content: center;
          margin-top: 26px;
        }

        .landing-wrapper .landing-section {
          padding: 54px 0;
        }

        .landing-wrapper .landing-section-header {
          max-width: 860px;
          margin-left: auto;
          margin-right: auto;
          text-align: center;
          margin-bottom: 34px;
        }

        .landing-wrapper .landing-section-title,
        .landing-wrapper .landing-phase-days,
        .landing-wrapper .landing-benefit-title {
          color: rgba(240, 210, 122, 0.95); /* dourado com mais contraste */
        }

        .landing-wrapper .landing-phase-desc {
          color: rgba(255, 255, 255, 0.68);
        }

        .landing-wrapper .landing-phases-grid {
          position: relative;
          gap: 16px;
        }

        /* Conector visual de progresso (desktop: 4 colunas) */
        @media (min-width: 960px) {
          .landing-wrapper .landing-phases-grid::before {
            content: '';
            position: absolute;
            left: 6%;
            right: 6%;
            top: 44px;
            height: 2px;
            background: linear-gradient(90deg, rgba(215,178,74,0.12), rgba(240,210,122,0.45), rgba(215,178,74,0.12));
            border-radius: 999px;
            pointer-events: none;
          }
        }

        .landing-wrapper .landing-phase-card {
          height: 100%;
          min-height: 260px; /* cards com mesma altura */
          border-color: rgba(215, 178, 74, 0.22);
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          opacity: 0;
          transform: translateY(10px);
          transition-delay: calc(var(--i, 0) * 60ms);
        }

        .landing-wrapper .landing-phase-card.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .landing-wrapper .landing-phase-card--featured {
          border-color: rgba(215, 178, 74, 0.46);
          background: linear-gradient(135deg, rgba(215,178,74,0.16), rgba(255,255,255,0.02));
          box-shadow: var(--glow-gold);
          transform: translateY(0) scale(1.02);
        }

        .landing-wrapper .landing-phase-card--featured.is-visible {
          transform: translateY(0) scale(1.02);
        }

        .landing-wrapper .landing-phase-card--featured .landing-phase-number {
          color: rgba(240, 210, 122, 0.14);
        }

        .landing-wrapper .landing-phase-card--featured .landing-phase-icon {
          background: rgba(215, 178, 74, 0.18);
          border-color: rgba(215, 178, 74, 0.55);
        }

        .landing-wrapper .landing-phase-start-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(240, 210, 122, 0.96);
          border: 1px solid rgba(215, 178, 74, 0.44);
          background: rgba(215, 178, 74, 0.10);
          margin-top: 6px;
        }

        /* Benefícios: manter 2 colunas e centralizar o conjunto (inclui a linha de Execução/Legado) */
        .landing-wrapper .landing-benefits-grid {
          grid-template-columns: repeat(2, minmax(0, 420px));
          justify-content: center;
          gap: 16px;
          grid-auto-rows: 1fr; /* cards com mesma altura */
        }

        .landing-wrapper .landing-benefit-card {
          height: 100%;
          display: grid;
          grid-template-rows: auto auto 1fr;
          align-content: start;
        }

        .landing-wrapper .landing-benefit-text {
          color: rgba(255, 255, 255, 0.66);
        }

        /* Autoridade: centralizado, largura 700–900, texto interno à esquerda */
        .landing-wrapper .landing-authority-block {
          max-width: 820px;
          margin: 0 auto;
          text-align: left;
          padding: 38px 34px;
        }

        @media (max-width: 620px) {
          .landing-wrapper .landing-hero {
            padding: 54px 0 30px;
          }

          .landing-wrapper .landing-subheadline {
            max-width: 92%;
            font-size: 16px;
          }

          .landing-wrapper .landing-section-header {
            text-align: left;
          }

          .landing-wrapper .landing-benefits-grid {
            grid-template-columns: 1fr;
          }

          .landing-wrapper .landing-authority-block {
            padding: 28px 22px;
          }
        }
      `}</style>
      <div className="container">

        {/* ══════ HERO ══════ */}
        <section className="hero landing-hero">
          <span className="badge landing-badge">{t('landing.badge')}</span>

          <h1 className="landing-headline">
            {t('landing.headline')}
          </h1>

          <p className="landing-subheadline">
            {t('landing.subheadline_1')}
            <br />
            <br />
            {t('landing.subheadline_2')}
          </p>

          <div className="hero-actions">
            <Link
              className="btn btn-primary btn-mentor-glow landing-cta-primary"
              to="/checkout"
            >
              {t('landing.cta_primary')}
            </Link>
            <Link className="btn landing-cta-secondary" to="/login">
              {t('landing.cta_secondary')}
            </Link>
          </div>
        </section>

        {/* ══════ COMO FUNCIONA — 4 FASES ══════ */}
        <section className="section landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              {t('landing.phases_title')}
            </h2>
            <p className="landing-section-sub">
              {t('landing.phases_subtitle')}
            </p>
          </div>

          <div className="landing-phases-grid">
            {Array.isArray(phases) && phases.map(function (ph, idx) {
              var Icon = PHASE_ICONS[idx]
              return (
                <div
                  key={idx}
                  className={
                    idx === 0
                      ? 'landing-phase-card landing-phase-card--featured'
                      : 'landing-phase-card'
                  }
                  data-phase-card
                  style={{ '--i': idx }}
                >
                  <div className="landing-phase-number">{idx + 1}</div>
                  <div className="landing-phase-icon">
                    <Icon size={22} />
                  </div>
                  <div className="landing-phase-days">{ph.days}</div>
                  <div className="landing-phase-name">{ph.name}</div>
                  <div className="landing-phase-desc">{ph.desc}</div>
                  {idx === 0 ? (
                    <div className="landing-phase-start-badge">{t('landing.phase_start_badge')}</div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        {/* ══════ BENEFÍCIOS ══════ */}
        <section className="section landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              {t('landing.benefits_title')}
            </h2>
          </div>

          <div className="landing-benefits-grid">
            {Array.isArray(benefits) && benefits.map(function (b, idx) {
              var Icon = BENEFIT_ICONS[idx]
              return (
                <div key={idx} className="landing-benefit-card">
                  <div className="landing-benefit-icon">
                    <Icon size={20} />
                  </div>
                  <div className="landing-benefit-title">{b.title}</div>
                  <div className="landing-benefit-text">{b.text}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ══════ PROVA DE AUTORIDADE ══════ */}
        <section className="section landing-section">
          <div className="landing-authority-block">
            <h2 className="landing-authority-title">
              {t('landing.authority_title')}
            </h2>
            <div className="landing-authority-body">
              <p>
                {t('landing.authority_body_1')}
              </p>
              <p dangerouslySetInnerHTML={{ __html: t('landing.authority_body_2') }} />
              <p>
                {t('landing.authority_body_3')}
              </p>
            </div>
          </div>
        </section>

        {/* ══════ CTA FINAL ══════ */}
        <section className="section landing-section" style={{ paddingBottom: 64 }}>
          <div className="landing-final-cta">
            <div className="landing-final-cta-title">
              {t('landing.final_cta_title')}
            </div>
            <div className="landing-final-cta-sub">
              {t('landing.final_cta_sub')}
            </div>
            <Link
              className="btn btn-primary btn-mentor-glow landing-cta-primary"
              to="/checkout"
            >
              {t('landing.final_cta_btn')}
            </Link>
          </div>
        </section>

      </div>

      {/* ══════ RODAPÉ ══════ */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '24px 0',
          textAlign: 'center',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to="/politica-de-privacidade"
              style={{
                fontSize: 13,
                color: 'rgba(215, 178, 74, 0.8)',
                textDecoration: 'none',
              }}
            >
              {t('footer.privacy')}
            </Link>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}
