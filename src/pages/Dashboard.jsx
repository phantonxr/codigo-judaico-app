import { useEffect, useMemo, useState } from 'react'
import MetricCard from '../components/MetricCard.jsx'
import SectionCard from '../components/SectionCard.jsx'
import QuickActionCard from '../components/QuickActionCard.jsx'
import { challenges } from '../data/challenges.js'
import { lessons } from '../data/lessons.js'
import { userProfile } from '../mock/userProfile.js'
import { pickWisdomForDate } from '../data/wisdom.js'
import {
  computeProgressPct,
  loadChallengeProgress,
} from '../utils/challengeProgress.js'
import { readJson, writeJson } from '../utils/storage.js'

const DAILY_ACTION_KEY = 'daily_action'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function getDailyActionState() {
  return readJson(DAILY_ACTION_KEY, { date: null, done: false })
}

function setDailyActionDone() {
  writeJson(DAILY_ACTION_KEY, { date: todayKey(), done: true })
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [dailyAction, setDailyAction] = useState(() => {
    const state = getDailyActionState()
    const today = todayKey()
    if (state.date !== today) {
      writeJson(DAILY_ACTION_KEY, { date: today, done: false })
      return { date: today, done: false }
    }
    return state
  })

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(t)
  }, [])

  const wisdom = useMemo(() => pickWisdomForDate(new Date()), [])

  const currentChallenge = useMemo(
    () => challenges.find((c) => c.id === userProfile.currentChallengeId) ?? challenges[0],
    [],
  )
  const challengeProgress = useMemo(
    () => loadChallengeProgress(currentChallenge),
    [currentChallenge],
  )
  const challengePct = computeProgressPct(challengeProgress)

  const netWorth = userProfile.netWorthBuilding
  const netWorthLabel = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(netWorth)

  function completeDailyAction() {
    setDailyActionDone()
    setDailyAction({ date: todayKey(), done: true })
  }

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title="Resumo financeiro"
        description="Hierarquia clara, visão rápida e progresso real."
      >
        {loading ? (
          <div className="dashboard-metrics">
            <div className="skeleton" style={{ height: 96 }} />
            <div className="skeleton" style={{ height: 96 }} />
            <div className="skeleton" style={{ height: 96 }} />
            <div className="skeleton" style={{ height: 96 }} />
          </div>
        ) : (
          <div className="dashboard-stack">
            <div className="dashboard-metrics">
              <MetricCard
                label="Nível atual"
                value="Nível 1"
                hint="Consistência > intensidade"
              />
              <MetricCard
                label="Sequência"
                value={`${userProfile.streakDays} dias`}
                hint="Seu ritmo está firme"
              />
              <MetricCard
                label="Score consciência"
                value={`${userProfile.financialAwarenessScore}/100`}
                hint="Mockado (futuro: IA + dados)"
              />
              <MetricCard
                label="Patrimônio em construção"
                value={netWorthLabel}
                hint="Projeção mockada"
              />
            </div>

            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>Desafio atual</div>
                  <span className="badge">{challengePct}%</span>
                </div>
                <div className="muted">{currentChallenge.title}</div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${challengePct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="dashboard-two">
        <SectionCard title="Ação de hoje" description="Uma decisão simples, um ganho composto.">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              Hoje observe um gasto automático que você faria sem pensar.
            </div>
            <div className="muted">
              Pergunte: isso me aproxima ou me afasta do patrimônio?
            </div>
            <button
              className={`btn btn-primary ${dailyAction.done ? 'btn-done' : ''}`}
              type="button"
              onClick={completeDailyAction}
              disabled={dailyAction.done}
            >
              {dailyAction.done ? 'Ação concluída' : 'Concluir ação'}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Conselho judaico do dia"
          description="Curto, prático e orientado a equilíbrio."
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <span className="badge">{wisdom.source}</span>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{wisdom.teaching}</div>
            <div className="muted">
              Hoje escolha 1 decisão pequena que reduza ansiedade financeira.
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Próximo passo" description="CTAs claros para avançar agora.">
        <div className="grid grid-3">
          <QuickActionCard
            title="Falar com Rabino Mentor"
            description="Organize sua mente e suas próximas ações."
            to="/mentor"
          />
          <QuickActionCard
            title="Continuar desafio"
            description="Marque o dia atual e registre a reflexão."
            to="/desafios"
          />
          <QuickActionCard
            title="Assistir próxima aula"
            description={`Biblioteca com ${lessons.length} ensinamentos.`}
            to="/biblioteca"
          />
        </div>
      </SectionCard>
    </div>
  )
}
