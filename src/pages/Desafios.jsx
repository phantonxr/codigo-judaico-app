import { useMemo, useState } from 'react'
import ChallengeCard from '../components/ChallengeCard.jsx'
import SectionCard from '../components/SectionCard.jsx'
import { challenges } from '../data/challenges.js'
import {
  computeProgressPct,
  currentDayIndex,
  loadChallengeProgress,
  saveChallengeProgress,
} from '../utils/challengeProgress.js'

function computeStreak(checkedDays) {
  let streak = 0
  for (let i = 0; i < checkedDays.length; i += 1) {
    if (!checkedDays[i]) break
    streak += 1
  }
  return streak
}

export default function Desafios() {
  const [openId, setOpenId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [drawerProgress, setDrawerProgress] = useState(null)
  const selectedChallenge = useMemo(
    () => challenges.find((c) => c.id === openId) ?? null,
    [openId],
  )

  const progress = drawerProgress

  const dayIdx = progress ? currentDayIndex(progress) : 0
  const activeDay = selectedDay ?? dayIdx

  function openChallenge(challengeId) {
    setOpenId(challengeId)
    setSelectedDay(null)
    const ch = challenges.find((c) => c.id === challengeId)
    if (ch) setDrawerProgress(loadChallengeProgress(ch))
  }

  function closeDrawer() {
    setOpenId(null)
    setSelectedDay(null)
    setDrawerProgress(null)
  }

  function toggleDay(i) {
    if (!selectedChallenge || !progress) return
    const checkedDays = [...progress.checkedDays]
    checkedDays[i] = !checkedDays[i]
    const next = { ...progress, checkedDays }
    saveChallengeProgress(selectedChallenge.id, next)
    setDrawerProgress(next)
    setSelectedDay(i)
  }

  function updateReflection(text) {
    if (!selectedChallenge || !progress) return
    const reflections = [...progress.reflections]
    reflections[activeDay] = text
    const next = { ...progress, reflections }
    saveChallengeProgress(selectedChallenge.id, next)
    setDrawerProgress(next)
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title="Desafios"
        description="Experiência interativa com progresso, streak e reflexão."
      >
        <div className="grid">
          {challenges.map((c) => {
            const p = loadChallengeProgress(c)
            const pct = computeProgressPct(p)
            const streak = computeStreak(p.checkedDays)
            return (
              <ChallengeCard
                key={c.id}
                {...c}
                progressPct={pct}
                streak={streak}
                onOpen={() => openChallenge(c.id)}
              />
            )
          })}
        </div>
      </SectionCard>

      {selectedChallenge && progress ? (
        <div className="drawer-overlay" role="dialog" aria-modal="true">
          <div className="drawer">
            <div className="drawer-head">
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {selectedChallenge.title}
                </div>
                <div className="muted">{selectedChallenge.description}</div>
              </div>
              <button className="icon-btn" type="button" onClick={closeDrawer} aria-label="Fechar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6 6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="drawer-body">
              <div className="progress" aria-label="Progresso do desafio">
                <div
                  className="progress-fill"
                  style={{ width: `${computeProgressPct(progress)}%` }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge">Dia {activeDay + 1} de {selectedChallenge.days}</span>
                <span className="badge">Streak: {computeStreak(progress.checkedDays)} dias</span>
                <span className="badge">Recompensa</span>
              </div>

              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>Ação prática do dia</div>
                  <div className="muted">
                    {selectedChallenge.dailyActions[activeDay]}
                  </div>
                </div>
              </div>

              <div className="day-grid" aria-label="Dias do desafio">
                {Array.from({ length: selectedChallenge.days }).map((_, i) => (
                  <label key={String(i)} className={`day-item ${i === activeDay ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(progress.checkedDays[i])}
                      onChange={() => toggleDay(i)}
                    />
                    <span>Dia {i + 1}</span>
                  </label>
                ))}
              </div>

              <div className="field">
                <label htmlFor="reflection">Como me senti hoje</label>
                <textarea
                  id="reflection"
                  className="input"
                  rows={4}
                  value={progress.reflections[activeDay] ?? ''}
                  onChange={(e) => updateReflection(e.target.value)}
                  placeholder="Escreva em 2–3 frases..."
                />
              </div>

              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>Mini recompensa</div>
                  <div className="muted">{selectedChallenge.reward}</div>
                </div>
              </div>
            </div>

            <div className="drawer-foot">
              <button className="btn" type="button" onClick={closeDrawer}>
                Continuar amanhã
              </button>
              <button className="btn btn-primary" type="button" onClick={closeDrawer}>
                Salvar e fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
