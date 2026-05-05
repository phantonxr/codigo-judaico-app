import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { getAvailablePlans } from '../services/payments.js'

const OFFER_DEADLINE_KEY = 'offer_deadline_chodesh'

function resolveOfferDeadlineMs(nowMs) {
  try {
    const raw = window.localStorage.getItem(OFFER_DEADLINE_KEY)
    const parsed = raw ? Number(raw) : 0
    if (Number.isFinite(parsed) && parsed > nowMs) return parsed
  } catch {
    // ignore
  }

  const next = nowMs + 24 * 60 * 60 * 1000
  try {
    window.localStorage.setItem(OFFER_DEADLINE_KEY, String(next))
  } catch {
    // ignore
  }
  return next
}

function formatCountdown(msRemaining) {
  const safe = Math.max(0, Math.floor(msRemaining / 1000))
  const hh = String(Math.floor(safe / 3600)).padStart(2, '0')
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function buildUpgradeLink(planId, email) {
  const params = new URLSearchParams({ plan: planId, reason: 'payment_required' })
  if (email) params.set('email', email)
  return `/checkout?${params.toString()}`
}

function PlanUpgradeCard({ plan, email, onFocusAnnualHint, onBlurAnnualHint, t }) {
  const isAnnual = plan.id === 'anual'
  const isDisabled = plan.isDisabled
  const ctaLabel = plan.ctaLabel || t('common.back')

  return (
    <div
      className="card"
      style={plan.isHighlighted ? { borderColor: 'rgba(215, 178, 74, 0.65)', boxShadow: 'var(--glow-gold)' } : undefined}
      onMouseEnter={isAnnual ? onFocusAnnualHint : undefined}
      onMouseLeave={isAnnual ? onBlurAnnualHint : undefined}
    >
      <div
        className="card-inner"
        style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{plan.name}</div>
            <div className="muted">{plan.description}</div>
          </div>
          {plan.badge ? <span className="badge">{plan.badge}</span> : null}
        </div>

        <div>
          <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 22 }}>{plan.price}</div>
          <div className="muted">{plan.period}</div>
          {plan.meta ? (
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>
              {plan.meta}
            </div>
          ) : null}
        </div>

        {isDisabled ? (
          <button
            type="button"
            className={'btn btn-block' + (plan.isHighlighted ? ' btn-primary' : '')}
            style={{ marginTop: 'auto', opacity: 0.6, cursor: 'not-allowed' }}
            disabled
          >
            {t('subscription.unavailable')}
          </button>
        ) : (
          <Link
            className={'btn btn-block' + (plan.isPrimary ? ' btn-primary' : '')}
            style={{ marginTop: 'auto', fontWeight: 800 }}
            to={buildUpgradeLink(plan.id, email)}
            onFocus={isAnnual ? onFocusAnnualHint : undefined}
            onBlur={isAnnual ? onBlurAnnualHint : undefined}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

export default function Assinatura() {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const planName = currentUser?.plan || '-'
  const planStatus = currentUser?.planStatus || (planName && planName !== '-' ? t('admin.statuses.active') : '-')
  const nextChargeDate = currentUser?.nextChargeDate || '-'
  const hasActiveAccess = currentUser?.hasActiveAccess !== false
  const [availablePlans, setAvailablePlans] = useState([])

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [offerDeadlineMs, setOfferDeadlineMs] = useState(() => resolveOfferDeadlineMs(Date.now()))

  const popupShownRef = useRef(new Set())
  const popupTimeoutRef = useRef(null)
  const [popup, setPopup] = useState(null)
  const [showAnnualHint, setShowAnnualHint] = useState(false)

  function showPopupOnce(id, message) {
    if (popupShownRef.current.has(id)) return
    popupShownRef.current.add(id)

    setPopup({ id, message })

    if (popupTimeoutRef.current) window.clearTimeout(popupTimeoutRef.current)
    popupTimeoutRef.current = window.setTimeout(() => {
      setPopup((current) => (current?.id === id ? null : current))
    }, 9000)
  }

  useEffect(() => {
    getAvailablePlans()
      .then((plans) => setAvailablePlans(plans ?? []))
      .catch(() => setAvailablePlans([]))
  }, [])

  useEffect(() => {
    setOfferDeadlineMs(resolveOfferDeadlineMs(Date.now()))
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      showPopupOnce('signup_5s', t('subscription.popup_10'))
    }, 5000)
    const t3 = window.setTimeout(() => {
      showPopupOnce('signup_20s', t('subscription.popup_20'))
    }, 20000)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t3)
      if (popupTimeoutRef.current) window.clearTimeout(popupTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const plansForUi = useMemo(() => {
    const byId = new Map((availablePlans ?? []).map((p) => [String(p.id), p]))
    const hasRenewal = byId.has('renovacao')

    const buildPlan = (id, overrides) => {
      const base = byId.get(id)
      const isDisabled = id === 'renovacao' ? !base : false
      return {
        id,
        name: overrides.name,
        price: overrides.price,
        period: overrides.period,
        description: overrides.description,
        isHighlighted: Boolean(overrides.isHighlighted),
        isPrimary: Boolean(overrides.isPrimary),
        badge: overrides.badge ?? null,
        meta: overrides.meta ?? null,
        ctaLabel: overrides.ctaLabel ?? null,
        isDisabled,
      }
    }

    const sederId = hasRenewal ? 'renovacao' : 'primeiro-acesso'

    return [
      buildPlan(sederId, {
        name: 'Seder HaKesef — 21 Dias',
        price: 'R$ 29,90',
        period: 'acesso por 21 dias',
        description: 'A fase inicial para estabilizar sua vida financeira e revelar os gatilhos que controlam suas decisões.',
        badge: 'Etapa inicial',
        ctaLabel: 'Começar Seder HaKesef (21 dias)',
      }),
      buildPlan('mensal', {
        name: 'Trilha Chodesh HaMelech',
        price: 'R$ 37,90',
        period: 'acesso mensal à trilha',
        description: 'O mês do domínio financeiro. A fase para tratar os gatilhos identificados e assumir controle real sobre seus impulsos de gasto.',
        badge: 'Próxima fase natural',
        isPrimary: true,
        isHighlighted: true,
        ctaLabel: 'Desbloquear minha Trilha Chodesh HaMelech',
      }),
      buildPlan('anual', {
        name: 'Jornada Anual Shnat HaKatzir',
        price: 'R$ 397,90',
        period: '12 meses de jornada',
        description: 'Um ano de acompanhamento para atravessar domínio, plantação e colheita financeira com o Rabino Mentor.',
        badge: 'Melhor escolha',
        meta: 'Economia de R$ 56,90 em relação ao plano mensal por 12 meses.\n12,5% de desconto.',
        ctaLabel: 'Garantir minha Jornada Anual',
      }),
      buildPlan('vitalicio', {
        name: 'Legado Vitalício Brit HaOsher',
        price: 'R$ 497,90',
        period: 'acesso definitivo',
        description: 'Acesso permanente ao método e às trilhas de prosperidade judaica. Ideal para quem quer construir domínio financeiro, patrimônio e legado sem interrupções.',
        badge: 'Acesso definitivo',
        meta: 'Melhor escolha para quem quer acesso definitivo.',
        ctaLabel: 'Liberar acesso definitivo',
      }),
    ]
  }, [availablePlans])

  const remainingMs = Math.max(0, offerDeadlineMs - nowMs)
  const countdownText = formatCountdown(remainingMs)
  const benefits = t('subscription.benefits', { returnObjects: true })

  return (
    <div className="container dashboard-grid">
      <SectionCard
        title={t('subscription.title')}
        description={t('subscription.description')}
      >
        <div style={{ display: 'grid', gap: 18 }}>

          <div
            className="card"
            style={{
              borderColor: 'rgba(215, 178, 74, 0.55)',
              background: 'linear-gradient(180deg, rgba(215, 178, 74, 0.10), rgba(255,255,255,0.02))',
            }}
          >
            <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div className="badge" style={{ width: 'fit-content' }}>{t('subscription.special_offer_badge')}</div>
                  <div className="muted" style={{ lineHeight: 1.7 }}>
                    {t('subscription.special_offer_desc')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold-2)' }}>{countdownText}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{t('subscription.time_remaining')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
                {t('subscription.copy_title')}
              </div>
              <div className="muted" style={{ lineHeight: 1.75 }}>
                {t('subscription.copy_body_1')}
              </div>
              <div
                className="muted"
                style={{
                  lineHeight: 1.75,
                  padding: 14,
                  borderRadius: 16,
                  border: '1px solid rgba(215,178,74,0.22)',
                  background: 'rgba(215,178,74,0.06)',
                }}
              >
                {t('subscription.copy_body_2')}
              </div>
              <div
                className="muted"
                style={{
                  lineHeight: 1.75,
                  padding: 14,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {t('subscription.copy_body_3')}
              </div>
            </div>
          </div>

          {!hasActiveAccess ? (
            <div
              className="card"
              style={{
                borderColor: 'rgba(215, 178, 74, 0.6)',
                background: 'linear-gradient(180deg, rgba(215, 178, 74, 0.08), rgba(255,255,255,0.02))',
              }}
            >
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <span className="badge" style={{ width: 'fit-content' }}>{t('subscription.reactivate_badge')}</span>
                <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
                  {t('subscription.reactivate_title')}
                </div>
                <div className="muted" style={{ lineHeight: 1.7 }}>
                  {t('subscription.reactivate_desc')}
                </div>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div
              className="card-inner"
              style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{t('subscription.current_plan')}</div>
                  <div className="muted">{planName}</div>
                </div>
                <span className="badge">{planStatus}</span>
              </div>

              <div className="grid grid-2">
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                    <div className="muted">{t('subscription.plan_value')}</div>
                    <div style={{ fontWeight: 900, color: 'var(--gold-2)' }}>{t('subscription.plan_value_active')}</div>
                  </div>
                </div>
                <div className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                    <div className="muted">{t('subscription.valid_until')}</div>
                    <div style={{ fontWeight: 900 }}>{nextChargeDate}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900 }}>
                  {hasActiveAccess ? t('subscription.benefits_active') : t('subscription.benefits_renew')}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.82)' }}>
                  {Array.isArray(benefits) && benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {plansForUi.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t('subscription.choose_track')}</div>

              {showAnnualHint ? (
                <div
                  className="card"
                  style={{
                    boxShadow: 'none',
                    borderColor: 'rgba(215,178,74,0.35)',
                    background: 'rgba(215,178,74,0.06)',
                  }}
                >
                  <div className="card-inner" style={{ padding: 12 }}>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                      {t('subscription.annual_hint')}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="subscription-grid">
                {plansForUi.map((plan) => (
                  <PlanUpgradeCard
                    key={plan.id}
                    plan={plan}
                    email={currentUser?.email}
                    onFocusAnnualHint={() => setShowAnnualHint(true)}
                    onBlurAnnualHint={() => setShowAnnualHint(false)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {popup ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 88,
            width: 'min(420px, calc(100% - 32px))',
            zIndex: 60,
          }}
        >
          <div
            className="card"
            style={{
              borderColor: 'rgba(215,178,74,0.38)',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(255,255,255,0.03))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="card-inner" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.6, flex: 1 }}>
                {popup.message}
              </div>
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => setPopup(null)}
                style={{ padding: '8px 10px', borderRadius: 12 }}
              >
                {t('subscription.close_popup')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
