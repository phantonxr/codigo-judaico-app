import { Lock, Unlock, Check, ChevronRight, Trophy, Shield, TrendingUp, Landmark, ShieldCheck, Crown } from 'lucide-react'
import { getMonthProgress, isMonthCompleted, isMonthUnlocked } from '../hooks/useJourneyProgress.js'
import { MONTH_PLAN } from '../data/sixMonthJourney.js'

var MONTH_ICONS = [Landmark, Shield, TrendingUp, Landmark, ShieldCheck, Crown]

/**
 * MonthMilestoneCard -- Card for a single month in the 6-month macro program.
 *
 * Props:
 *   monthNum: 1-6
 *   onOpen: (monthNum) => void
 */
export default function MonthMilestoneCard({ monthNum, onOpen }) {
  var plan = MONTH_PLAN[monthNum - 1]
  var progress = getMonthProgress(monthNum)
  var completed = isMonthCompleted(monthNum)
  var unlocked = isMonthUnlocked(monthNum)
  var Icon = MONTH_ICONS[monthNum - 1] || Landmark

  var borderColor = completed
    ? 'rgba(74,215,100,0.35)'
    : unlocked
      ? 'rgba(215,178,74,0.45)'
      : 'rgba(255,255,255,0.08)'

  return (
    <div
      className={'card month-milestone-card' + (completed ? ' glass-card month-completed' : unlocked ? ' glass-card' : '')}
      style={{
        borderColor: borderColor,
        opacity: unlocked ? 1 : 0.5,
        cursor: unlocked ? 'pointer' : 'default',
        transition: 'all 250ms ease',
      }}
      onClick={unlocked ? function () { onOpen(monthNum) } : undefined}
      role={unlocked ? 'button' : undefined}
      tabIndex={unlocked ? 0 : undefined}
    >
      <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="month-icon-wrap" style={{
              background: completed ? 'rgba(74,215,100,0.12)' : unlocked ? 'rgba(215,178,74,0.12)' : 'rgba(255,255,255,0.04)',
              borderColor: completed ? 'rgba(74,215,100,0.3)' : unlocked ? 'rgba(215,178,74,0.3)' : 'rgba(255,255,255,0.1)',
            }}>
              <Icon size={18} style={{ color: completed ? '#4ad764' : unlocked ? 'var(--gold-2)' : 'var(--muted)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: completed ? '#4ad764' : unlocked ? 'var(--gold-2)' : 'var(--muted)' }}>
                {monthNum}o Mes
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{plan.title}</div>
            </div>
          </div>
          {completed ? (
            <span className="badge" style={{ background: 'rgba(74,215,100,0.12)', borderColor: 'rgba(74,215,100,0.35)', color: '#4ad764' }}>
              <Trophy size={12} /> Completo
            </span>
          ) : unlocked ? (
            <ChevronRight size={18} style={{ color: 'var(--gold-2)' }} />
          ) : (
            <Lock size={16} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          )}
        </div>

        {/* Subtitle */}
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{plan.subtitle}</div>

        {/* Progress */}
        {unlocked && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div className="progress">
              <div className="progress-fill" style={{ width: progress.percent + '%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">{progress.completed}/30 dias</span>
              <span className="muted">{progress.percent}%</span>
            </div>
          </div>
        )}

        {/* Pillars preview */}
        {unlocked && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {plan.pillars.slice(0, 3).map(function (p, i) {
              return <span key={i} className="badge" style={{ fontSize: 10, padding: '4px 8px' }}>{p}</span>
            })}
            {plan.pillars.length > 3 && (
              <span className="badge" style={{ fontSize: 10, padding: '4px 8px', opacity: 0.6 }}>+{plan.pillars.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        {unlocked && !completed && (
          <button className="btn btn-primary" type="button" style={{ marginTop: 4 }}>
            {progress.completed === 0 ? 'Comecar mes' : 'Continuar'} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
