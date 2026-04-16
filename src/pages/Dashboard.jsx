import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Star, Crown, Sprout, Target, ChevronRight, Lock, Trophy, BookOpen, TrendingUp, Sparkles, Shield } from 'lucide-react'
import MetricCard from '../components/MetricCard.jsx'
import useDailyWisdom from '../hooks/useDailyWisdom.js'
import useFinancialDiagnosis from '../hooks/useFinancialDiagnosis.js'
import {
  getCurrentDayIndex,
  getFullPhase,
  getPhaseProgress,
  isPhaseUnlocked,
  getTotalJourneyProgress,
  ESCADA_PHASES,
  getEmotionalScore,
  getPatrimonyScore,
  readJourneyProgress,
  getLastAIFeedback,
  getDisciplineScore,
} from '../hooks/useJourneyProgress.js'
import { TRACK_LABELS } from '../data/challenges21Days.js'

var PHASE_ICONS = {
  flame: Flame,
  crown: Crown,
  sprout: Sprout,
  star: Star,
}

var PHASE_BENEFITS = [
  'Voce identifica exatamente onde perde dinheiro, quais emocoes disparam seus gastos e cria a fundacao para nunca mais viver no piloto automatico financeiro.',
  'Voce domina os impulsos de compra, constroi resistencia emocional e assume o comando total da sua vida financeira com clareza e estrategia.',
  'Voce planta patrimonio real — reserva de emergencia, bens, investimentos. Cada dia e um tijolo no edificio da sua liberdade financeira.',
  'Voce colhe abundancia. Desfruta do melhor da terra, consolida seu legado e vive a prosperidade que as geracoes judaicas ensinaram.',
]

export default function Dashboard() {
  var navigate = useNavigate()
  var { diagnosis, assignedTrack } = useFinancialDiagnosis()

  var stateR = useState(0)
  var setRefresh = stateR[1]

  useEffect(function () {
    var sync = function () { setRefresh(function (r) { return r + 1 }) }
    window.addEventListener('journey_progress_updated', sync)
    window.addEventListener('diagnosis_updated', sync)
    return function () {
      window.removeEventListener('journey_progress_updated', sync)
      window.removeEventListener('diagnosis_updated', sync)
    }
  }, [])

  var dayIndex = getCurrentDayIndex()
  var currentPhase = getFullPhase()
  var totalProgress = getTotalJourneyProgress()
  var emotional = getEmotionalScore()
  var patrimony = getPatrimonyScore()
  var progress = readJourneyProgress()
  var streak = progress.streak || 0
  var wisdom = useDailyWisdom()
  var discipline = getDisciplineScore()
  var lastFeedback = getLastAIFeedback()

  if (!diagnosis || !assignedTrack) {
    return (
      <div className="container" style={{ display: 'grid', gap: 20, paddingTop: 12 }}>
        <div className="glass-card" style={{ padding: 24, display: 'grid', gap: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold-2)', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            A Jornada Milenar da Prosperidade Judaica
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            Este metodo e inspirado em principios ensinados por geracoes na tradicao judaica,
            onde prosperidade nao nasce do corte cego de gastos, mas da <span style={{ color: 'var(--gold-2)', fontWeight: 700 }}>ordem, disciplina emocional,
            construcao patrimonial e visao de legado</span>.
          </div>
          <div style={{
            padding: 18, borderRadius: 16,
            border: '1px solid rgba(215,178,74,0.35)',
            background: 'linear-gradient(135deg, rgba(215,178,74,0.1), rgba(215,178,74,0.03))',
            display: 'grid', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--gold-2)' }} />
              <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--gold-2)' }}>Comece sua transformacao</div>
            </div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Descubra sua trilha personalizada respondendo ao diagnostico financeiro.
              Ele identifica seu perfil e inicia sua jornada de 365 dias rumo a prosperidade plena.
            </div>
            <button className="btn btn-primary btn-mentor-glow" type="button" onClick={function () { navigate('/avaliacao') }} style={{ marginTop: 4 }}>
              <Target size={16} /> Iniciar Avaliacao Financeira
            </button>
          </div>
          {wisdom && (
            <div style={{ fontStyle: 'italic', color: 'var(--gold-2)', fontSize: 13, lineHeight: 1.7, padding: '8px 0 0', opacity: 0.85 }}>
              &ldquo;{wisdom.teaching}&rdquo; <span className="muted" style={{ fontSize: 11 }}>&mdash; {wisdom.source}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  var trackLabel = TRACK_LABELS[assignedTrack] || assignedTrack

  return (
    <div className="container" style={{ display: 'grid', gap: 20, paddingTop: 12, paddingBottom: 110 }}>

      {/* ══════ HERO BLOCK ══════ */}
      <div className="dash-hero">
        <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold-2)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          A Jornada Milenar da Prosperidade Judaica
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          Este metodo e inspirado em principios ensinados por geracoes na tradicao judaica,
          onde prosperidade nao nasce do corte cego de gastos, mas da <span style={{ color: 'var(--gold-2)', fontWeight: 700 }}>ordem, disciplina emocional,
          construcao patrimonial e visao de legado</span>.
        </div>
      </div>

      {/* ══════ JOURNEY PROGRESS BAR ══════ */}
      <div className="journey-bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--gold-2)' }} /> Jornada Total
          </span>
          <span style={{ fontWeight: 900, color: 'var(--gold-2)' }}>{totalProgress.percent}%</span>
        </div>
        <div className="progress" style={{ height: 7 }}>
          <div className="progress-fill" style={{ width: totalProgress.percent + '%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
          <span>Dia {dayIndex + 1} &middot; {trackLabel}</span>
          <span>Streak: {streak} dias</span>
        </div>
      </div>

      {/* ══════ SCORE METRICS ══════ */}
      <div className="dashboard-metrics">
        <MetricCard label="Streak" value={streak + 'd'} hint="Consecutivos" />
        <MetricCard label="Emocional" value={emotional + '%'} hint="Autoconhecimento" />
        <MetricCard label="Patrimonio" value={patrimony + '%'} hint="Construcao" />
        <MetricCard label="Disciplina" value={discipline + '%'} hint="Consistencia" />
      </div>

      {/* ══════ 4 PHASE CARDS — ESCADA DE ASCENSÃO ══════ */}
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.01em' }}>Escada de Ascensao</div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          4 fases progressivas. Cada fase desbloqueia a proxima. A progressao e obrigatoria — nao existe atalho.
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {ESCADA_PHASES.map(function (ph, idx) {
          var unlocked = isPhaseUnlocked(idx)
          var pp = getPhaseProgress(idx)
          var isCurrent = currentPhase.id === ph.id
          var isCompleted = pp.percent >= 100
          var Icon = PHASE_ICONS[ph.icon] || Star
          var benefit = PHASE_BENEFITS[idx]

          return (
            <div
              key={ph.id}
              className={'escada-card' + (isCurrent ? ' escada-current' : '') + (isCompleted ? ' escada-done' : '') + (!unlocked ? ' escada-locked' : '')}
            >
              {/* Badge: Fase Atual / Concluida / Bloqueado */}
              {isCurrent && (
                <div className="escada-badge escada-badge-current">
                  <Sparkles size={10} /> Fase Atual
                </div>
              )}
              {isCompleted && !isCurrent && (
                <div className="escada-badge escada-badge-done">
                  <Star size={10} /> Concluida
                </div>
              )}
              {!unlocked && (
                <div className="escada-badge escada-badge-locked">
                  <Lock size={10} /> Bloqueado
                </div>
              )}

              {/* Icon + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: (isCurrent || isCompleted || !unlocked) ? 6 : 0 }}>
                <div className={'escada-icon' + (isCurrent ? ' escada-icon-active' : '')} style={{ '--phase-color': ph.color }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: unlocked ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                    {ph.name}
                  </div>
                  <div style={{ fontSize: 12, color: unlocked ? 'var(--muted)' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {ph.subtitle}
                  </div>
                </div>
              </div>

              {/* Promise */}
              <div style={{ fontSize: 13, lineHeight: 1.6, color: unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                {ph.promise}
              </div>

              {/* Benefit */}
              <div style={{ fontSize: 12, lineHeight: 1.65, color: unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)' }}>
                {benefit}
              </div>

              {/* Progress (unlocked) */}
              {unlocked && (
                <div style={{ display: 'grid', gap: 6, marginTop: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
                    <span>{pp.completed}/{pp.total} dias</span>
                    <span style={{ color: ph.color }}>{pp.percent}%</span>
                  </div>
                  <div className="progress" style={{ height: 5 }}>
                    <div className="progress-fill" style={{ width: pp.percent + '%', background: ph.color }} />
                  </div>
                  {pp.daysRemaining > 0 && !isCompleted && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Faltam {pp.daysRemaining} dias para completar esta fase
                    </div>
                  )}
                </div>
              )}

              {/* Reward / Next level */}
              <div style={{
                fontSize: 11, lineHeight: 1.5, marginTop: 2,
                padding: '8px 12px', borderRadius: 10,
                background: unlocked ? 'rgba(215,178,74,0.06)' : 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (unlocked ? 'rgba(215,178,74,0.15)' : 'rgba(255,255,255,0.05)'),
                display: 'flex', alignItems: 'center', gap: 6,
                color: unlocked ? 'var(--gold-2)' : 'rgba(255,255,255,0.3)',
              }}>
                <Trophy size={12} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 700 }}>{ph.reward}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════ RETENTION COPY — PERSUASIVE ══════ */}
      <div className="retention-block">
        <div className="retention-block-title">
          <Shield size={14} /> Por que a progressao e obrigatoria
        </div>
        <div className="retention-block-body">
          Quem abandona a jornada volta a servir aos mesmos gatilhos que o mantinham preso.
          Na tradicao judaica, prosperidade e construida em camadas:
          <strong> estabilidade &rarr; dominio &rarr; plantacao &rarr; colheita</strong>.
          Nao existe atalho. Existe consistencia diaria.
        </div>
      </div>

      {/* ══════ LAST AI FEEDBACK ══════ */}
      {lastFeedback && (
        <div className="glass-card" style={{
          padding: 16, borderRadius: 16,
          border: '1px solid rgba(179,136,255,0.2)',
          display: 'grid', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={14} style={{ color: '#b388ff' }} />
            <span style={{ fontWeight: 800, fontSize: 11, color: '#b388ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ultimo feedback do Rabino Mentor</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)' }}>
            {(lastFeedback.summary || '').slice(0, 200)}{(lastFeedback.summary || '').length > 200 ? '...' : ''}
          </div>
        </div>
      )}

      {/* ══════ WISDOM ══════ */}
      {wisdom && (
        <div style={{
          fontStyle: 'italic', color: 'var(--gold-2)', fontSize: 14, lineHeight: 1.8,
          padding: '8px 16px',
          borderLeft: '3px solid rgba(215,178,74,0.4)',
          opacity: 0.85,
        }}>
          &ldquo;{wisdom.teaching}&rdquo;
          <div className="muted" style={{ fontSize: 11, fontStyle: 'normal', marginTop: 4 }}>&mdash; {wisdom.source}</div>
        </div>
      )}

      {/* ══════ FIXED BOTTOM CTA ══════ */}
      <div className="sticky-cta-bar">
        <Link to="/desafios" className="btn btn-primary btn-mentor-glow sticky-cta-btn">
          Continuar minha ascensao <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
