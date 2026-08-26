import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createCheckoutSession, postMetaLeadEvent } from '../services/payments.js'
import { getBookCatalog } from '../services/books.js'
import {
  LEGAL_DOCUMENT_TYPES,
  buildLegalAcceptancePayload,
  findLegalDocument,
  getActiveLegalDocuments,
  normalizeLegalLanguage,
} from '../services/legal.js'
import { useUtmParams } from '../hooks/useUtmParams.js'
import { hasMarketingConsent } from '../services/privacyConsent.js'
import DisclaimerBanner from '../components/legal/DisclaimerBanner.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import LegalDocumentModal from '../components/legal/LegalDocumentModal.jsx'
import { Clock, BookOpen, Gift, Flame, Sparkles } from 'lucide-react'

const MINIMUM_PASSWORD_LENGTH = 8
const DEFAULT_PLAN_ID = 'primeiro-acesso'
const METHOD_BOOK_ID = 'metodo-judaico-riqueza'
const METHOD_BONUS_BOOK_IDS = [
  '7-gatilhos-dinheiro-desaparecer',
  '7-gatilhos-dinheiro-escapar',
]

const PLAN_CATALOG = {
  'primeiro-acesso': {
    id: 'primeiro-acesso',
    title: 'Seder HaKesef — 21 Dias',
    price: 'R$ 29,90',
    subtitle: 'A fase inicial para estabilizar sua vida financeira e revelar os gatilhos que controlam suas decisões.',
    highlight: 'Etapa inicial',
  },
  renovacao: {
    id: 'renovacao',
    title: 'Seder HaKesef — 21 Dias',
    price: 'R$ 29,90',
    subtitle: 'Condição especial para continuar a etapa inicial por mais 21 dias.',
    highlight: 'Condição liberada',
  },
  mensal: {
    id: 'mensal',
    title: 'Trilha Chodesh HaMelech',
    price: 'R$ 37,90',
    subtitle: 'O mês do domínio financeiro — acesso mensal à trilha para tratar os gatilhos e governar seus impulsos.',
    highlight: 'Próxima fase natural',
  },
  anual: {
    id: 'anual',
    title: 'Jornada Anual Shnat HaKatzir',
    price: 'R$ 397,90',
    subtitle: '12 meses de jornada com economia de R$ 56,90 em relação ao mensal (12,5% de desconto).',
    highlight: 'Melhor escolha',
  },
  vitalicio: {
    id: 'vitalicio',
    title: 'Legado Vitalício Brit HaOsher',
    price: 'R$ 497,90',
    subtitle: 'Acesso permanente ao método e às trilhas de prosperidade judaica. Ideal para quem quer acesso definitivo.',
    highlight: 'Acesso definitivo',
  },
}

function resolvePlan(planId) {
  const normalized = String(planId ?? '').trim().toLowerCase()
  return PLAN_CATALOG[normalized] ?? PLAN_CATALOG[DEFAULT_PLAN_ID]
}

function buildFreshCheckoutPath(planId) {
  const selectedPlan = resolvePlan(planId)
  return `/checkout?plan=${encodeURIComponent(selectedPlan.id)}`
}

function getLegalLabel(type, t) {
  const normalized = String(type ?? '').trim().toLowerCase()
  if (normalized === 'terms') return t('legal.labels.terms')
  if (normalized === 'privacy') return t('legal.labels.privacy')
  if (normalized === 'disclaimer') return t('legal.labels.disclaimer')
  return type
}

function resolvePromise(planId, t) {
  const known = ['mensal', 'anual', 'vitalicio']
  const pid = String(planId || '')
  return t('checkout.plans.promises.' + (known.includes(pid) ? pid : 'default'))
}

function resolveCtaLabel(planId, t) {
  const known = ['primeiro-acesso', 'renovacao']
  const pid = String(planId || '')
  return t('checkout.plans.cta_labels.' + (known.includes(pid) ? pid : 'default'))
}

function isMethodBonusBook(bookId) {
  return METHOD_BONUS_BOOK_IDS.includes(String(bookId || ''))
}

function sortBooksForOffer(books) {
  return [...books].sort(function (a, b) {
    const score = function (book) {
      if (book.id === METHOD_BOOK_ID) return 0
      if (isMethodBonusBook(book.id)) return 1
      return 2
    }

    const scoreDiff = score(a) - score(b)
    return scoreDiff || String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR')
  })
}

export default function CheckoutPage() {
  const { t, i18n } = useTranslation()
  const legalLanguage = normalizeLegalLanguage(i18n.language)
  const [searchParams] = useSearchParams()
  const selectedPlan = resolvePlan(searchParams.get('plan'))
  const planTitle = t('checkout.plans.titles.' + selectedPlan.id, { defaultValue: selectedPlan.title })
  const planHighlight = t('checkout.plans.highlights.' + selectedPlan.id, { defaultValue: selectedPlan.highlight })
  const planSubtitle = t('checkout.plans.subtitles.' + selectedPlan.id, { defaultValue: selectedPlan.subtitle })
  const promise = resolvePromise(selectedPlan.id, t)
  const ctaLabel = resolveCtaLabel(selectedPlan.id, t)

  const isPrimaryOffer = selectedPlan.id === 'primeiro-acesso'
  const submitLabel = ctaLabel

  const interactUntilRef = useRef(0)
  const [toast, setToast] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableBooks, setAvailableBooks] = useState([])
  const [selectedBookIds, setSelectedBookIds] = useState([])
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [legalData, setLegalData] = useState(null)
  const [legalLoading, setLegalLoading] = useState(true)
  const [legalError, setLegalError] = useState('')
  const [selectedLegalDocument, setSelectedLegalDocument] = useState(null)
  const redirectedFromLogin = searchParams.get('reason') === 'payment_required'
  const existingAccountFlow = redirectedFromLogin && Boolean(email)
  const planSectionRef = useRef(null)

  useEffect(function () {
    getBookCatalog()
      .then(function (data) {
        setAvailableBooks(sortBooksForOffer((data || []).filter(function (b) { return b.isPurchasable })))
      })
      .catch(function () {})
  }, [])

  useEffect(function () {
    var frameId = window.requestAnimationFrame(function () {
      planSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })

    return function () {
      window.cancelAnimationFrame(frameId)
    }
  }, [selectedPlan.id])

  useEffect(function () {
    var fbclid = searchParams.get('fbclid')
    if (!fbclid) return

    var fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + fbclid
    var eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)

    if (window.fbq && hasMarketingConsent()) {
      window.fbq('track', 'Lead', {
        content_name: selectedPlan.title,
        content_ids: [selectedPlan.id],
        content_type: 'product',
      }, { eventID: eventId })
    }

    postMetaLeadEvent({
      fbClickId: fbc,
      planId: selectedPlan.id,
      planName: selectedPlan.title,
      eventId,
    }).catch(function () {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(function () {
    let alive = true
    setLegalLoading(true)
    setLegalError('')
    setAcceptedLegal(false)

    getActiveLegalDocuments(legalLanguage)
      .then(function (data) {
        if (!alive) return
        setLegalData(data)
      })
      .catch(function (caught) {
        if (!alive) return
        setLegalError(String(caught?.message ?? t('checkout.legal.loading_error')).replace(/^API \d+:\s*/u, ''))
      })
      .finally(function () {
        if (alive) setLegalLoading(false)
      })

    return function () {
      alive = false
    }
  }, [legalLanguage, t])

  const utm = useUtmParams()

  const [secondsLeft, setSecondsLeft] = useState(10 * 60)

  useEffect(function () {
    var timer = setInterval(function () {
      setSecondsLeft(function (s) {
        return s > 0 ? s - 1 : 0
      })
    }, 1000)

    return function () {
      clearInterval(timer)
    }
  }, [])

  const countdownLabel = useMemo(function () {
    var mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
    var ss = String(secondsLeft % 60).padStart(2, '0')
    return mm + ':' + ss
  }, [secondsLeft])

  const isUrgentWindow = secondsLeft > 0 && secondsLeft <= 5 * 60
  const hasMethodBookSelected = selectedBookIds.includes(METHOD_BOOK_ID)
  const checkoutBookIds = hasMethodBookSelected
    ? selectedBookIds.filter(function (id) { return !isMethodBonusBook(id) })
    : selectedBookIds

  const toastPool = useMemo(
    function () {
      if (!isPrimaryOffer) return []

      const items = t('checkout.primary_offer.toasts', { returnObjects: true })

      return items.map((item) => ({
        ...item,
        icon:
          item.type === 'scarcity' && item.icon === 'flame'
            ? <Flame size={16} />
            : item.icon === 'clock'
              ? <Clock size={16} />
              : <Sparkles size={16} />,
      }))
    },
    [isPrimaryOffer, t],
  )

  function markInteracting() {
    interactUntilRef.current = Date.now() + 1800
  }

  useEffect(
    function () {
      if (!isPrimaryOffer) return
      if (!toastPool.length) return

      let alive = true
      let hideTimer = null
      let showTimer = null

      function pickRandomToast() {
        return toastPool[Math.floor(Math.random() * toastPool.length)]
      }

      function attemptShow() {
        if (!alive) return
        if (loading) return
        if (document && document.visibilityState === 'hidden') return

        // Don't pop while user is actively typing.
        if (Date.now() < interactUntilRef.current) {
          scheduleNext()
          return
        }

        const next = pickRandomToast()
        setToast(next)
        setToastVisible(true)

        if (hideTimer) window.clearTimeout(hideTimer)
        const visibleMs = 4000 + Math.floor(Math.random() * 2000) // 4–6s
        hideTimer = window.setTimeout(function () {
          setToastVisible(false)
        }, visibleMs)

        scheduleNext()
      }

      function scheduleNext() {
        if (!alive) return
        if (showTimer) window.clearTimeout(showTimer)
        const nextMs = 12000 + Math.floor(Math.random() * 8000) // 12–20s
        showTimer = window.setTimeout(attemptShow, nextMs)
      }

      // Start after a short delay so the hero doesn't feel jumpy.
      showTimer = window.setTimeout(attemptShow, 9000)

      return function () {
        alive = false
        if (hideTimer) window.clearTimeout(hideTimer)
        if (showTimer) window.clearTimeout(showTimer)
      }
    },
    [isPrimaryOffer, toastPool, loading],
  )

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!existingAccountFlow && password.trim().length < MINIMUM_PASSWORD_LENGTH) {
      setError(t('checkout.errors.password_too_short', { min: MINIMUM_PASSWORD_LENGTH }))
      return
    }

    if (!existingAccountFlow && password !== passwordConfirmation) {
      setError(t('checkout.errors.password_mismatch'))
      return
    }

    if (legalLoading || legalError || !legalData?.activeVersions) {
      setError(legalError || t('checkout.legal.documents_unavailable'))
      return
    }

    if (!acceptedLegal) {
      setError(t('checkout.legal.acceptance_required'))
      return
    }

    setLoading(true)

    try {
      const fbclid = searchParams.get('fbclid')
      const fbClickId = fbclid
        ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`
        : null

      const response = await createCheckoutSession({
        name,
        email,
        planId: selectedPlan.id,
        password,
        utmSource: utm.utm_source ?? null,
        utmMedium: utm.utm_medium ?? null,
        utmCampaign: utm.utm_campaign ?? null,
        utmTerm: utm.utm_term ?? null,
        utmContent: utm.utm_content ?? null,
        marketingConsent: hasMarketingConsent(),
        fbClickId,
        bookIds: checkoutBookIds,
        legalAcceptance: buildLegalAcceptancePayload(legalData.activeVersions, legalLanguage),
      })

      if (!response?.url) {
        throw new Error(t('checkout.errors.no_url'))
      }

      if (window.fbq && hasMarketingConsent()) {
        window.fbq('track', 'InitiateCheckout', {
          value: response.amountInCents ? response.amountInCents / 100 : undefined,
          currency: 'BRL',
          content_name: selectedPlan.title,
          content_ids: [selectedPlan.id],
          content_type: 'product',
          num_items: 1,
        }, { eventID: response.sessionId })
      }

      window.location.href = response.url
    } catch (caught) {
      const nextError =
        caught?.data?.detail ||
        caught?.data?.message ||
        caught?.message ||
        t('checkout.errors.generic')
      setError(
        String(nextError).replace(/^API \d+:\s*/u, ''),
      )
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 72px' }}>
      <title>{`Checkout — Código Judaico da Prosperidade`}</title>
      <meta name="robots" content="noindex, nofollow" />
      <LegalDocumentModal
        document={selectedLegalDocument}
        open={Boolean(selectedLegalDocument)}
        onClose={() => setSelectedLegalDocument(null)}
      />

      {isPrimaryOffer && toast ? (
        <div className={'checkout-toast' + (toastVisible ? ' checkout-toast--visible' : '')} aria-hidden="true">
          <div className="checkout-toast__inner">
            <div className="checkout-toast__icon">{toast.icon}</div>
            <div className="checkout-toast__content">
              <div className="checkout-toast__title">{toast.title}</div>
              <div className="checkout-toast__message">{toast.message}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gap: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
        </div>
        <div ref={planSectionRef} />
        <DisclaimerBanner compact />

        <div className="card">
          <div className="card-inner checkout-hero">
            {isPrimaryOffer ? (
              <>
                <span className="badge" style={{ width: 'fit-content' }}>
                  {t('checkout.primary_offer.badge')}
                </span>

                <h1 className="checkout-hero-title">
                  {t('checkout.primary_offer.title')}
                </h1>

                <div className="checkout-subheadline">
                  <div className="checkout-subheadline__icon" aria-hidden="true">
                    <Sparkles size={16} />
                  </div>
                  <div className="checkout-subheadline__text">
                    {t('checkout.primary_offer.subheadline_prefix')}{' '}
                    <span className="checkout-emphasis">{t('checkout.primary_offer.mentor_name')}</span>, {t('checkout.primary_offer.subheadline_suffix_prefix')}{' '}
                    <span className="checkout-emphasis">{t('checkout.primary_offer.subheadline_emphasis')}</span>{' '}
                    {t('checkout.primary_offer.subheadline_suffix_end')}
                  </div>
                </div>

                <div className="checkout-hero-quote">
                  {t('checkout.primary_offer.quote')}
                </div>
              </>
            ) : (
              <>
                <span className="badge" style={{ width: 'fit-content' }}>
                  Checkout
                </span>

                <h1 className="checkout-hero-title">{planTitle}</h1>

                <p className="checkout-hero-subtitle">
                  {promise}
                </p>
              </>
            )}

            {isPrimaryOffer ? (
              <div className="checkout-offer">
                <div className="checkout-price">
                  <div className="checkout-price-from">De R$297,00</div>
                  <div className="checkout-price-to">
                    <span className="checkout-price-prefix">por</span>
                    <strong>R$29,90</strong>
                  </div>
                </div>

                <div className="checkout-alert" role="note" aria-label={t('checkout.primary_offer.urgency_aria')}>
                  <div className="checkout-alert__icon" aria-hidden="true">
                    <Flame size={16} />
                  </div>
                  <div className="checkout-alert__body">
                    <div className="checkout-alert__title">{t('checkout.primary_offer.discount_title')}</div>
                    <div className="checkout-alert__text">
                      {t('checkout.primary_offer.discount_text_prefix')} <span className="checkout-emphasis">{t('checkout.primary_offer.discount_remaining_count')}</span> {t('checkout.primary_offer.discount_text_suffix')}
                    </div>
                  </div>
                </div>

                <div className={'checkout-timer' + (isUrgentWindow ? ' checkout-timer--urgent' : '')}>
                  <div className="checkout-timer__icon" aria-hidden="true">
                    <Clock size={16} />
                  </div>
                  <div className="checkout-timer__content">
                    <div className="checkout-timer__label">{t('checkout.primary_offer.timer_label')}</div>
                    <div className="checkout-timer__time" aria-label={t('checkout.primary_offer.timer_aria', { time: countdownLabel })}>{countdownLabel}</div>
                  </div>
                </div>

                <div className="checkout-bullets" aria-label={t('checkout.primary_offer.benefits_aria')}>
                  <div className="checkout-bullet">{t('checkout.primary_offer.benefits.access')}</div>
                  <div className="checkout-bullet">{t('checkout.primary_offer.benefits.activities')}</div>
                  <div className="checkout-bullet">{t('checkout.primary_offer.benefits.mentor')}</div>
                </div>
              </div>
            ) : (
              <div className="checkout-offer">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>{planTitle}</strong>
                  <span className="badge">{planHighlight}</span>
                </div>
                <div className="muted" style={{ lineHeight: 1.6 }}>{planSubtitle}</div>
                <div style={{ fontWeight: 950, fontSize: 26, color: 'var(--gold-2)' }}>{selectedPlan.price}</div>
              </div>
            )}
          </div>
        </div>

        {isPrimaryOffer ? (
          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                {t('checkout.primary_offer.includes_title')}
              </div>
              <div className="checkout-includes">
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">{t('checkout.primary_offer.includes.journey.title')}</div>
                  <div className="checkout-mini-card-text">{t('checkout.primary_offer.includes.journey.text')}</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">{t('checkout.primary_offer.includes.mentor.title')}</div>
                  <div className="checkout-mini-card-text">{t('checkout.primary_offer.includes.mentor.text')}</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">{t('checkout.primary_offer.includes.assessment.title')}</div>
                  <div className="checkout-mini-card-text">{t('checkout.primary_offer.includes.assessment.text')}</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">{t('checkout.primary_offer.includes.diagnosis.title')}</div>
                  <div className="checkout-mini-card-text">{t('checkout.primary_offer.includes.diagnosis.text')}</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">{t('checkout.primary_offer.includes.mastery.title')}</div>
                  <div className="checkout-mini-card-text">{t('checkout.primary_offer.includes.mastery.text')}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isPrimaryOffer ? (
          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                {t('checkout.primary_offer.testimonials_title')}
              </div>
              <div className="checkout-testimonials">
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">{t('checkout.primary_offer.testimonials.fernanda.name')}</div>
                  <div className="checkout-testimonial-text">{t('checkout.primary_offer.testimonials.fernanda.text')}</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">{t('checkout.primary_offer.testimonials.jorge.name')}</div>
                  <div className="checkout-testimonial-text">{t('checkout.primary_offer.testimonials.jorge.text')}</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">{t('checkout.primary_offer.testimonials.lucas.name')}</div>
                  <div className="checkout-testimonial-text">{t('checkout.primary_offer.testimonials.lucas.text')}</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">{t('checkout.primary_offer.testimonials.luciana.name')}</div>
                  <div className="checkout-testimonial-text">{t('checkout.primary_offer.testimonials.luciana.text')}</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">{t('checkout.primary_offer.testimonials.paulo.name')}</div>
                  <div className="checkout-testimonial-text">{t('checkout.primary_offer.testimonials.paulo.text')}</div>
                </div>
                {/* ⭐⭐⭐⭐⭐
                Sempre guardei dinheiro, mas deixava de viver. Deixei de sair com minha família e de viajar. Hoje aprendi a viver melhor e construir patrimônio ao mesmo tempo. */}
              </div>
            </div>
          </div>
        ) : null}

        {isPrimaryOffer ? (
          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>{t('checkout.primary_offer.guarantee_title')}</div>
              <div className="muted" style={{ lineHeight: 1.7 }}>
                {t('checkout.primary_offer.guarantee_text')}
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="checkout-form" style={{ display: 'grid', gap: 18 }}>

          {availableBooks.length > 0 && (
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={18} style={{ color: 'var(--gold-2)', flexShrink: 0 }} />
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {t('checkout.books_upsell.title')}
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {t('checkout.books_upsell.description')}
                </div>

                <div className={'checkout-book-promo' + (hasMethodBookSelected ? ' checkout-book-promo--active' : '')}>
                  <div className="checkout-book-promo__icon" aria-hidden="true">
                    <Gift size={17} />
                  </div>
                  <div className="checkout-book-promo__copy">
                    <div className="checkout-book-promo__title">{t('checkout.books_upsell.promo_title')}</div>
                    <div className="checkout-book-promo__text">
                      {hasMethodBookSelected
                        ? t('checkout.books_upsell.promo_active')
                        : t('checkout.books_upsell.promo_inactive')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {availableBooks.map(function (book) {
                    const isSelected = selectedBookIds.includes(book.id)
                    const isMethodBook = book.id === METHOD_BOOK_ID
                    const isBonusBook = isMethodBonusBook(book.id)
                    const isFreeWithMethod = hasMethodBookSelected && isBonusBook
                    const checked = isSelected || isFreeWithMethod
                    return (
                      <label
                        key={book.id}
                        className={'checkout-book-option' + (checked ? ' checkout-book-option--selected' : '') + (isFreeWithMethod ? ' checkout-book-option--free' : '')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          cursor: isFreeWithMethod ? 'default' : 'pointer',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${checked ? 'rgba(215, 178, 74, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                          background: checked ? 'rgba(215, 178, 74, 0.08)' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isFreeWithMethod}
                          onChange={function (e) {
                            if (e.target.checked) {
                              setSelectedBookIds(function (prev) {
                                if (isMethodBook) {
                                  return [...prev.filter(function (id) {
                                    return id !== METHOD_BOOK_ID && !isMethodBonusBook(id)
                                  }), book.id]
                                }

                                return prev.includes(book.id) ? prev : [...prev, book.id]
                              })
                            } else {
                              setSelectedBookIds(function (prev) { return prev.filter(function (id) { return id !== book.id }) })
                            }
                          }}
                          style={{ marginTop: 2, accentColor: 'var(--gold-2)', width: 16, height: 16, flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'flex-start' }}>
                          <div className="checkout-book-cover-fallback" aria-hidden="true">
                            <BookOpen size={18} />
                          </div>
                          <div style={{ display: 'grid', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{book.title}</div>
                              {isMethodBook ? <span className="checkout-book-mini-badge">{t('checkout.books_upsell.method_badge')}</span> : null}
                              {isFreeWithMethod ? (
                                <span className="checkout-book-mini-badge checkout-book-mini-badge--free">{t('checkout.books_upsell.bonus_badge')}</span>
                              ) : null}
                            </div>
                            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{book.description}</div>
                            {isFreeWithMethod ? (
                              <div className="checkout-book-free-price">
                                <span>{book.priceLabel}</span>
                                <strong>{t('checkout.books_upsell.free_label')}</strong>
                              </div>
                            ) : (
                              <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14 }}>+ {book.priceLabel}</div>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>
                  {isPrimaryOffer ? t('checkout.primary_offer.form_title') : (existingAccountFlow ? t('checkout.form_title_existing') : t('checkout.form_title_new'))}
                </div>
                <div className="muted" style={{ lineHeight: 1.6 }}>
                  {existingAccountFlow
                    ? t('checkout.existing_account')
                    : (isPrimaryOffer
                      ? t('checkout.primary_offer.form_subtitle')
                      : t('checkout.new_account'))}
                </div>
              </div>

              {existingAccountFlow ? (
                <div
                  className="muted"
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: '1px solid rgba(215, 178, 74, 0.35)',
                    background: 'rgba(215, 178, 74, 0.08)',
                    color: 'var(--text)',
                  }}
                  dangerouslySetInnerHTML={{ __html: t('checkout.existing_account_note', { email }) }}
                />
              ) : null}

              {existingAccountFlow ? null : (
                <div className="field">
                  <label htmlFor="checkout-name">{t('checkout.name_label')}</label>
                  <input
                    id="checkout-name"
                    className="input"
                    type="text"
                    value={name}
                    onChange={(event) => {
                      markInteracting()
                      setName(event.target.value)
                    }}
                    onFocus={markInteracting}
                    placeholder={t('checkout.name_placeholder')}
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="checkout-email">{t('checkout.email_label')}</label>
                <input
                  id="checkout-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    markInteracting()
                    setEmail(event.target.value)
                  }}
                  onFocus={markInteracting}
                  placeholder={t('checkout.email_placeholder')}
                  readOnly={existingAccountFlow}
                  required
                />
              </div>

              {existingAccountFlow ? null : (
                <div className="field">
                  <label htmlFor="checkout-password">{t('checkout.password_label')}</label>
                  <input
                    id="checkout-password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      markInteracting()
                      setPassword(event.target.value)
                    }}
                    onFocus={markInteracting}
                    placeholder={t('checkout.password_placeholder')}
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {existingAccountFlow ? null : (
                <div className="field">
                  <label htmlFor="checkout-password-confirmation">{t('checkout.confirm_password_label')}</label>
                  <input
                    id="checkout-password-confirmation"
                    className="input"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) => {
                      markInteracting()
                      setPasswordConfirmation(event.target.value)
                    }}
                    onFocus={markInteracting}
                    placeholder={t('checkout.confirm_password_placeholder')}
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              <div className="muted"
                dangerouslySetInnerHTML={{
                  __html: existingAccountFlow
                    ? t('checkout.account_note_existing', { email })
                    : t('checkout.account_note_new', { email: email || t('checkout.account_note_placeholder') })
                }}
              />

              {existingAccountFlow ? (
                <div className="muted" style={{ fontSize: 14 }}>
                  {t('checkout.other_account_note')}{' '}
                  <Link to={buildFreshCheckoutPath(selectedPlan.id)}>{t('checkout.other_account_link')}</Link>.
                </div>
              ) : null}

              <div className="legal-consents" aria-label={t('checkout.legal.acknowledgements_aria')}>
                {legalLoading ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    {t('checkout.legal.loading')}
                  </div>
                ) : null}

                {legalError ? (
                  <div className="muted" style={{ color: '#f3b0b0', fontSize: 13 }}>
                    {legalError}
                  </div>
                ) : null}

                {!legalLoading && legalData ? (
                  <div className="legal-doc-links">
                    {LEGAL_DOCUMENT_TYPES.map((type) => {
                      const document = findLegalDocument(legalData.documents, type)
                      return (
                        <button
                          key={type}
                          className="legal-link"
                          type="button"
                          onClick={() => setSelectedLegalDocument(document)}
                          disabled={!document}
                        >
                          {getLegalLabel(type, t)}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                <div className="legal-consent-row">
                  <input
                    id="checkout-legal-terms"
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(event) => setAcceptedLegal(event.target.checked)}
                    disabled={legalLoading || Boolean(legalError)}
                  />
                  <div className="legal-consent-copy">
                    <label htmlFor="checkout-legal-terms">
                      {t('checkout.legal.acceptance_label')}
                    </label>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="muted" style={{ color: '#f3b0b0' }}>
                  {error}
                </div>
              ) : null}

              <button className="btn btn-primary btn-block btn-mentor-glow" type="submit" disabled={loading} style={{ padding: '14px 16px', fontSize: 16 }}>
                {loading ? t('checkout.submit_loading') : submitLabel}
              </button>

              {isPrimaryOffer ? (
                <div className="checkout-cta-notes" aria-label={t('checkout.legal.payment_reassurance_aria')}>
                  <div>{t('checkout.primary_offer.cta_notes.stripe')}</div>
                  <div>{t('checkout.primary_offer.cta_notes.immediate')}</div>
                  <div>{t('checkout.primary_offer.cta_notes.mentor')}</div>
                </div>
              ) : (
                <div className="checkout-cta-notes" aria-label={t('checkout.legal.payment_reassurance_aria')}>
                  <div>{t('checkout.security_notes.stripe')}</div>
                  <div>{t('checkout.security_notes.immediate')}</div>
                  <div>{t('checkout.security_notes.access')}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn" to="/">
                  {t('checkout.back_to_landing')}
                </Link>
                <Link className="btn btn-soft" to="/login">
                  {existingAccountFlow ? t('checkout.back_to_login') : t('checkout.already_have_account')}
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
