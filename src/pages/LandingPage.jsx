import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Crown, Sprout, Star, Compass, BookOpen, Target, Award } from 'lucide-react'

var PHASES = [
  {
    icon: Flame,
    days: '21 dias',
    name: 'Consciência dos gatilhos',
    desc: 'Você identifica os gatilhos que fazem você perder dinheiro (impulso, ansiedade, comparação, medo) e passa a enxergar o padrão antes que ele te controle.',
  },
  {
    icon: Crown,
    days: '1 mês',
    name: 'Autocontrole e disciplina',
    desc: 'Você desenvolve autocontrole sobre esses gatilhos e aprende a tomar decisões com clareza — mesmo em dias ruins, sem voltar para o velho ciclo.',
  },
  {
    icon: Sprout,
    days: '6 meses',
    name: 'Primeiros patrimônios',
    desc: 'Você constrói seus primeiros patrimônios com equilíbrio: reservas, consistência e escolhas inteligentes — sem extremos e sem culpa.',
  },
  {
    icon: Star,
    days: '365 dias',
    name: 'Colheita máxima e legado',
    desc: 'Você colhe os grandes frutos da prosperidade: estabilidade, crescimento real e um legado que permanece — com paz e direção.',
  },
]

var BENEFITS = [
  { icon: Compass, title: 'Direção', text: 'Saiba exatamente o que fazer todos os dias para reorganizar sua vida financeira — sem depender de motivação.' },
  { icon: BookOpen, title: 'Mentoria', text: 'Receba orientação do Rabino Mentor IA para interpretar decisões, corrigir padrões e acelerar sua jornada.' },
  { icon: Target, title: 'Execução', text: 'Tarefas diárias reais que geram mudança financeira concreta — não teoria, ação.' },
  { icon: Award, title: 'Legado', text: 'Construa patrimônio e desfrute da riqueza sem viver como refém da escassez.' },
]

export default function LandingPage() {
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

  return (
    <div className="landing-wrapper">
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
          <span className="badge landing-badge">Método milenar judaico &bull; Experiência premium</span>

          <h1 className="landing-headline">
            DESCUBRA O MÉTODO QUE OS JUDEUS USAM POR 21 DIAS PARA TER UMA VIDA FINANCEIRA PRÓSPERA
          </h1>

          <p className="landing-subheadline">
            Mesmo em tempos de crise, instabilidade e escassez, existe um sistema seguido há gerações para construir riqueza, disciplina emocional, patrimônio e legado.
            <br />
            <br />
            Um método em 4 fases e atividades diárias que mudarão sua vida financeira, inspirado nos princípios que fizeram um povo prosperar até no deserto.
          </p>

          <div className="hero-actions">
            <Link
              className="btn btn-primary btn-mentor-glow landing-cta-primary"
              to="/checkout"
            >
              Quero desbloquear o método
            </Link>
            <Link className="btn landing-cta-secondary" to="/login">
              Já tenho acesso (Entrar)
            </Link>
          </div>
        </section>

        {/* ══════ COMO FUNCIONA — 4 FASES ══════ */}
        <section className="section landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              Prosperidade é uma transformação em 4 fases
            </h2>
            <p className="landing-section-sub">
              Primeiro você aprende a enxergar o que faz você perder dinheiro. Depois, domina o impulso.
              Em seguida, constrói seus primeiros patrimônios com equilíbrio. Por fim, colhe os grandes frutos da prosperidade e constrói um legado.
            </p>
          </div>

          <div className="landing-phases-grid">
            {PHASES.map(function (ph, idx) {
              var Icon = ph.icon
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
                    <div className="landing-phase-start-badge">Comece aqui • Início da jornada</div>
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
              O que você recebe dentro do método
            </h2>
          </div>

          <div className="landing-benefits-grid">
            {BENEFITS.map(function (b, idx) {
              var Icon = b.icon
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
              Por que esse método funciona há milênios?
            </h2>
            <div className="landing-authority-body">
              <p>
                Porque a prosperidade não nasce de cortes cegos.
              </p>
              <p>
                Ela nasce de <strong>ordem, disciplina emocional, visão de longo prazo e construção de patrimônio</strong>.
              </p>
              <p>
                É assim que um povo atravessou desertos, guerras e crises sem perder sua capacidade de prosperar.
              </p>
            </div>
          </div>
        </section>

        {/* ══════ CTA FINAL ══════ */}
        <section className="section landing-section" style={{ paddingBottom: 64 }}>
          <div className="landing-final-cta">
            <div className="landing-final-cta-title">
              Se você quer descobrir o método e ainda não tem acesso, comece sua jornada agora.
            </div>
            <div className="landing-final-cta-sub">
              Desbloqueie a experiência premium e siga a mesma progressão diária usada há gerações para construir riqueza e legado.
            </div>
            <Link
              className="btn btn-primary btn-mentor-glow landing-cta-primary"
              to="/checkout"
            >
              Quero começar minha ascensão
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
