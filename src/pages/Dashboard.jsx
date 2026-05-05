import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

export default function Dashboard() {
  const { t } = useTranslation()
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
  var phaseBenefits = t('dashboard.phase_benefits', { returnObjects: true })

  if (!diagnosis || !assignedTrack) {
    return (
      <div className="container" style={{ display: 'grid', gap: 20, paddingTop: 12 }}>
        <div className="glass-card" style={{ padding: 24, display: 'grid', gap: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold-2)', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            {t('dashboard.journey_title')}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            {t('dashboard.start_diagnosis_hint')}
          </div>
          <div style={{
            padding: 18, borderRadius: 16,
            border: '1px solid rgba(215,178,74,0.35)',
            background: 'linear-gradient(135deg, rgba(215,178,74,0.1), rgba(215,178,74,0.03))',
            display: 'grid', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--gold-2)' }} />
              <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--gold-2)' }}>{t('dashboard.start_transformation')}</div>
            </div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              {t('dashboard.start_diagnosis_hint')}
            </div>
            <button className="btn btn-primary btn-mentor-glow" type="button" onClick={function () { navigate('/avaliacao') }} style={{ marginTop: 4 }}>
              <Target size={16} /> {t('dashboard.start_assessment_btn')}
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
          {t('dashboard.journey_title')}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          {t('dashboard.start_diagnosis_hint')}
        </div>
      </div>

      {/* ══════ JOURNEY PROGRESS BAR ══════ */}
      <div className="journey-bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--gold-2)' }} /> {t('dashboard.total_journey')}
          </span>
          <span style={{ fontWeight: 900, color: 'var(--gold-2)' }}>{totalProgress.percent}%</span>
        </div>
        <div className="progress" style={{ height: 7 }}>
          <div className="progress-fill" style={{ width: totalProgress.percent + '%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
          <span>{t('dashboard.day_label', { day: dayIndex + 1 })} &middot; {trackLabel}</span>
          <span>{t('dashboard.streak_days', { count: streak })}</span>
        </div>
      </div>

      {/* ══════ SCORE METRICS ══════ */}
      <div className="dashboard-metrics">
        <MetricCard label={t('dashboard.metrics.streak')} value={streak + 'd'} hint={t('dashboard.metrics.streak_hint')} />
        <MetricCard label={t('dashboard.metrics.emotional')} value={emotional + '%'} hint={t('dashboard.metrics.emotional_hint')} />
        <MetricCard label={t('dashboard.metrics.patrimony')} value={patrimony + '%'} hint={t('dashboard.metrics.patrimony_hint')} />
        <MetricCard label={t('dashboard.metrics.discipline')} value={discipline + '%'} hint={t('dashboard.metrics.discipline_hint')} />
      </div>

      {/* ══════ 4 PHASE CARDS — ESCADA DE ASCENSÃO ══════ */}
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.01em' }}>{t('dashboard.ascension_ladder')}</div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {t('dashboard.ascension_description')}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {ESCADA_PHASES.map(function (ph, idx) {
          var unlocked = isPhaseUnlocked(idx)
          var pp = getPhaseProgress(idx)
          var isCurrent = currentPhase.id === ph.id
          var isCompleted = pp.percent >= 100
          var Icon = PHASE_ICONS[ph.icon] || Star
          var benefit = Array.isArray(phaseBenefits) ? phaseBenefits[idx] : ''
          var isMahalachRewardCta = String(ph.reward || '').indexOf('Desbloqueia Mahalach HaZera') >= 0

          var lockedCtaLabel = idx === 1
            ? t('dashboard.unlock_phase.1')
            : idx === 2
              ? t('dashboard.unlock_phase.2')
              : idx === 3
                ? t('dashboard.unlock_phase.3')
                : t('dashboard.unlock_phase.default')

          return (
            <div
              key={ph.id}
              className={'escada-card' + (isCurrent ? ' escada-current' : '') + (isCompleted ? ' escada-done' : '') + (!unlocked ? ' escada-locked' : '')}
            >
              {isCurrent && (
                <div className="escada-badge escada-badge-current">
                  <Sparkles size={10} /> {t('dashboard.phase_current')}
                </div>
              )}
              {isCompleted && !isCurrent && (
                <div className="escada-badge escada-badge-done">
                  <Star size={10} /> {t('dashboard.phase_done')}
                </div>
              )}
              {!unlocked && (
                <div className="escada-badge escada-badge-locked">
                  <Lock size={10} /> {t('dashboard.phase_locked')}
                </div>
              )}

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

              <div style={{ fontSize: 13, lineHeight: 1.6, color: unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                {ph.promise}
              </div>

              <div style={{ fontSize: 12, lineHeight: 1.65, color: unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)' }}>
                {benefit}
              </div>

              {unlocked && (
                <div style={{ display: 'grid', gap: 6, marginTop: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
                    <span>{t('dashboard.completed_days', { completed: pp.completed, total: pp.total })}</span>
                    <span style={{ color: ph.color }}>{pp.percent}%</span>
                  </div>
                  <div className="progress" style={{ height: 5 }}>
                    <div className="progress-fill" style={{ width: pp.percent + '%', background: ph.color }} />
                  </div>
                  {pp.daysRemaining > 0 && !isCompleted && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {t('dashboard.days_remaining', { count: pp.daysRemaining })}
                    </div>
                  )}
                </div>
              )}

              {isMahalachRewardCta ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block btn-mentor-glow"
                  onClick={function () { navigate('/assinatura') }}
                  style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                >
                  {ph.reward}
                </button>
              ) : (
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
              )}

              {!unlocked ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block btn-mentor-glow"
                  onClick={function () { navigate('/assinatura') }}
                  style={{ marginTop: 12, width: '100%', fontWeight: 900 }}
                >
                  {lockedCtaLabel}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* ══════ RETENTION COPY ══════ */}
      <div className="retention-block">
        <div className="retention-block-title">
          <Shield size={14} /> {t('dashboard.retention_title')}
        </div>
        <div className="retention-block-body" dangerouslySetInnerHTML={{ __html: t('dashboard.retention_body') }} />
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
            <span style={{ fontWeight: 800, fontSize: 11, color: '#b388ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.last_feedback_label')}</span>
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
          {t('dashboard.continue_btn')} <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
