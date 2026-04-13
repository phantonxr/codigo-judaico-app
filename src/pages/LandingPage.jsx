import { Link } from 'react-router-dom'
import { KIRVANO_URL } from '../data/offers.js'
import { Flame, Crown, Sprout, Star, Compass, BookOpen, Target, Award } from 'lucide-react'

var PHASES = [
  { icon: Flame, days: '21 Dias', name: 'Seder HaKesef', desc: 'Estabilizacao financeira e identificacao dos gatilhos mentais que sabotam sua prosperidade.' },
  { icon: Crown, days: '1 Mes', name: 'Chodesh HaMelech', desc: 'Dominio emocional e controle financeiro — voce assume o comando das suas decisoes.' },
  { icon: Sprout, days: '6 Meses', name: 'Mahalach HaZera', desc: 'Plantacao de patrimonio, liberdade e bens — cada dia e um tijolo no seu edificio financeiro.' },
  { icon: Star, days: '365 Dias', name: 'Shnat HaKatzir', desc: 'Colheita maxima, abundancia e legado — desfrute do melhor da terra.' },
]

var BENEFITS = [
  { icon: Compass, title: 'Direcao', text: 'Saiba exatamente o que fazer todos os dias para reorganizar sua vida financeira — sem depender de motivacao.' },
  { icon: BookOpen, title: 'Mentoria', text: 'Receba orientacao do Rabino Mentor IA para interpretar decisoes, corrigir padroes e acelerar sua jornada.' },
  { icon: Target, title: 'Execucao', text: 'Tarefas diarias reais que geram mudanca financeira concreta — nao teoria, acao.' },
  { icon: Award, title: 'Legado', text: 'Construa patrimonio e desfrute da riqueza sem viver como refem da escassez.' },
]

export default function LandingPage() {
  return (
    <div className="landing-wrapper">
      <div className="container">

        {/* ══════ HERO ══════ */}
        <section className="hero landing-hero">
          <span className="badge landing-badge">Metodo Milenar Judaico &bull; Experiencia Premium</span>

          <h1 className="landing-headline">
            Descubra o Metodo Judaico Milenar que Ensina Como Prosperar em Qualquer Cenario
          </h1>

          <p className="landing-subheadline">
            Mesmo em tempos de crise, instabilidade e escassez, existe um sistema seguido ha geracoes
            para construir riqueza, disciplina emocional, patrimonio e legado.
          </p>
          <p className="landing-subheadline" style={{ marginTop: 0 }}>
            Um metodo em fases diarias, inspirado nos principios que fizeram um povo prosperar ate no deserto.
          </p>

          <div className="hero-actions">
            <a
              className="btn btn-primary btn-mentor-glow landing-cta-primary"
              href={KIRVANO_URL}
              target="_blank"
              rel="noreferrer"
            >
              Quero desbloquear o metodo
            </a>
            <Link className="btn landing-cta-secondary" to="/login">
              Ja tenho acesso (Entrar)
            </Link>
          </div>
        </section>

        {/* ══════ COMO FUNCIONA — 4 FASES ══════ */}
        <section className="section landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              Toda prosperidade real e construida em 4 fases
            </h2>
            <p className="landing-section-sub">
              O povo judeu construiu, ao longo de milenios, um caminho progressivo de
              estabilidade, dominio, plantacao e colheita.
              No app, voce seguira a mesma jornada com tarefas diarias guiadas pelo Rabino Mentor IA.
            </p>
          </div>

          <div className="landing-phases-grid">
            {PHASES.map(function (ph, idx) {
              var Icon = ph.icon
              return (
                <div key={idx} className="landing-phase-card">
                  <div className="landing-phase-number">{idx + 1}</div>
                  <div className="landing-phase-icon">
                    <Icon size={22} />
                  </div>
                  <div className="landing-phase-days">{ph.days}</div>
                  <div className="landing-phase-name">{ph.name}</div>
                  <div className="landing-phase-desc">{ph.desc}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ══════ BENEFÍCIOS ══════ */}
        <section className="section landing-section">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              O que voce recebe dentro do metodo
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
              Por que esse metodo funciona ha milenios?
            </h2>
            <div className="landing-authority-body">
              <p>
                Porque prosperidade nao nasce de cortes cegos.
              </p>
              <p>
                Ela nasce de <strong>ordem, disciplina emocional, visao de longo prazo
                e construcao de patrimonio</strong>.
              </p>
              <p>
                E assim que um povo atravessou desertos, guerras e crises
                sem perder sua capacidade de prosperar.
              </p>
            </div>
          </div>
        </section>

        {/* ══════ CTA FINAL ══════ */}
        <section className="section landing-section" style={{ paddingBottom: 64 }}>
          <div className="landing-final-cta">
            <div className="landing-final-cta-title">
              Se voce quer descobrir o metodo e ainda nao tem acesso, comece sua jornada agora.
            </div>
            <div className="landing-final-cta-sub">
              Desbloqueie a experiencia premium e siga a mesma progressao diaria
              usada ha geracoes para construir riqueza e legado.
            </div>
            <a
              className="btn btn-primary btn-mentor-glow landing-cta-primary"
              href={KIRVANO_URL}
              target="_blank"
              rel="noreferrer"
            >
              Quero comecar minha ascensao
            </a>
          </div>
        </section>

      </div>
    </div>
  )
}
