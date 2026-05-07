import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createCheckoutSession } from '../services/payments.js'
import { getBookCatalog } from '../services/books.js'
import {
  LEGAL_DOCUMENT_TYPES,
  buildLegalAcceptancePayload,
  findLegalDocument,
  getActiveLegalDocuments,
  getLegalDocumentLabel,
  normalizeLegalLanguage,
} from '../services/legal.js'
import { useUtmParams } from '../hooks/useUtmParams.js'
import { hasMarketingConsent } from '../services/privacyConsent.js'
import FloatingProof from '../components/FloatingProof.jsx'
import DisclaimerBanner from '../components/legal/DisclaimerBanner.jsx'
import LegalDocumentModal from '../components/legal/LegalDocumentModal.jsx'
import { Zap, Clock, BookOpen, Gift } from 'lucide-react'

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

function resolveAccessLabel(planId, t) {
  const known = ['mensal', 'anual', 'vitalicio']
  const pid = String(planId || '')
  return t('checkout.plans.access_labels.' + (known.includes(pid) ? pid : 'default'))
}

function resolvePhaseLabel(planTitle) {
  var title = String(planTitle || '')
  var parts = title.split('—')
  var left = String(parts[0] || '').trim()
  return left || title
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
  const accessLabel = resolveAccessLabel(selectedPlan.id, t)
  const phaseLabel = resolvePhaseLabel(planTitle)
  const promise = resolvePromise(selectedPlan.id, t)
  const ctaLabel = resolveCtaLabel(selectedPlan.id, t)
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
        setLegalError(String(caught?.message ?? 'Could not load legal documents.').replace(/^API \d+:\s*/u, ''))
      })
      .finally(function () {
        if (alive) setLegalLoading(false)
      })

    return function () {
      alive = false
    }
  }, [legalLanguage])

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
      setError(legalError || 'Legal documents are not available yet. Please try again in a moment.')
      return
    }

    if (!acceptedLegal) {
      setError('Please agree to the Terms of Service, Privacy Policy, and Disclaimer before continuing.')
      return
    }

    setLoading(true)

    try {
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
        bookIds: checkoutBookIds,
        legalAcceptance: buildLegalAcceptancePayload(legalData.activeVersions, legalLanguage),
      })

      if (!response?.url) {
        throw new Error(t('checkout.errors.no_url'))
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
      <FloatingProof />
      <LegalDocumentModal
        document={selectedLegalDocument}
        open={Boolean(selectedLegalDocument)}
        onClose={() => setSelectedLegalDocument(null)}
      />

      <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gap: 22 }}>
        <DisclaimerBanner compact />

        <div className="card">
          <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
            <span className="badge" style={{ width: 'fit-content' }}>{t('checkout.badge')}</span>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05 }}>
              {t('checkout.title')}
            </h1>
            <div style={{ fontWeight: 900, color: 'var(--gold-2)', lineHeight: 1.35 }}>
              {t('checkout.social_proof')}
            </div>
            <div className="muted" style={{ lineHeight: 1.7 }}>
              {existingAccountFlow ? t('checkout.existing_account') : t('checkout.new_account')}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 22 }}>
          <div ref={planSectionRef} className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.85)' }}>
            <div
              className="card-inner"
              style={{
                background: 'linear-gradient(180deg, rgba(215, 178, 74, 0.14), rgba(255,255,255,0.04))',
                display: 'grid',
                gap: 12,
                borderRadius: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <strong style={{ fontSize: 18 }}>{planTitle}</strong>
                <span className="badge">{planHighlight}</span>
              </div>

              <div className="checkout-promise">
                {promise}
              </div>

              <div style={{ fontWeight: 900, fontSize: 28, color: 'var(--gold-2)' }}>
                {selectedPlan.price}
              </div>

              <div className="checkout-benefits">
                <div className="checkout-benefit">{t('checkout.benefits.triggers')}</div>
                <div className="checkout-benefit">{t('checkout.benefits.mentor')}</div>
                <div className="checkout-benefit">{t('checkout.benefits.journey')}</div>
              </div>

              <div className="muted" style={{ display: 'grid', gap: 4, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, color: 'rgba(255,255,255,0.85)' }}>{accessLabel}</div>
                <div dangerouslySetInnerHTML={{ __html: t('checkout.access_period', { phase: `<strong style="color:var(--gold-2)">${phaseLabel}</strong>` }).replace('<gold>', '').replace('</gold>', '') }} />
                <div style={{ maxWidth: 640 }}>{planSubtitle}</div>
              </div>

              <div className="checkout-window-alert">
                <div className="checkout-window-alert__title">
                  {t('checkout.window_alert_title')}
                </div>
                <div className="checkout-window-alert__sub">
                  {t('checkout.window_alert_sub')}
                </div>
              </div>

              <div className={'checkout-timer' + (isUrgentWindow ? ' checkout-timer--urgent' : '')}>
                <div className="checkout-timer__icon" aria-hidden="true">
                  {isUrgentWindow ? <Clock size={16} /> : <Zap size={16} />}
                </div>
                <div className="checkout-timer__content">
                  <div className="checkout-timer__title">
                    {isUrgentWindow ? t('checkout.timer_urgent_title') : t('checkout.timer_normal_title')}
                  </div>
                  <div className="checkout-timer__label">
                    {isUrgentWindow ? t('checkout.timer_urgent_label') : t('checkout.timer_normal_label')}
                  </div>
                  <div className="checkout-timer__time" aria-label={t('checkout.timer_aria', { time: countdownLabel })}>{countdownLabel}</div>
                </div>
              </div>
            </div>
          </div>

          {availableBooks.length > 0 && (
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={18} style={{ color: 'var(--gold-2)', flexShrink: 0 }} />
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {t('checkout.books_section_title')}
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {t('checkout.books_section_hint')}
                </div>

                <div className={'checkout-book-promo' + (hasMethodBookSelected ? ' checkout-book-promo--active' : '')}>
                  <div className="checkout-book-promo__icon" aria-hidden="true">
                    <Gift size={17} />
                  </div>
                  <div className="checkout-book-promo__copy">
                    <div className="checkout-book-promo__title">
                      {t('checkout.method_bonus_title')}
                    </div>
                    <div className="checkout-book-promo__text">
                      {hasMethodBookSelected ? t('checkout.method_bonus_active') : t('checkout.method_bonus_sub')}
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
                          {book.coverImageUrl ? (
                            <img
                              src={book.coverImageUrl}
                              alt={book.title}
                              style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                            />
                          ) : (
                            <div className="checkout-book-cover-fallback" aria-hidden="true">
                              <BookOpen size={18} />
                            </div>
                          )}
                          <div style={{ display: 'grid', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{book.title}</div>
                              {isMethodBook ? (
                                <span className="checkout-book-mini-badge">{t('checkout.method_bonus_badge')}</span>
                              ) : null}
                              {isFreeWithMethod ? (
                                <span className="checkout-book-mini-badge checkout-book-mini-badge--free">{t('checkout.method_bonus_free_badge')}</span>
                              ) : null}
                            </div>
                            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{book.description}</div>
                            {isFreeWithMethod ? (
                              <div className="checkout-book-free-price">
                                <span>{book.priceLabel}</span>
                                <strong>{t('checkout.method_bonus_free_label')}</strong>
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
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {existingAccountFlow ? t('checkout.form_title_existing') : t('checkout.form_title_new')}
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
                    onChange={(event) => setName(event.target.value)}
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
                  onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
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
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
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

              <div className="legal-consents" aria-label="Legal acknowledgements">
                {legalLoading ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Loading legal documents...
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
                          {getLegalDocumentLabel(type)}
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
                      I agree to the Terms of Service, Privacy Policy, and Disclaimer.
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
                {loading ? t('checkout.submit_loading') : ctaLabel}
              </button>

              <div className="muted" style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
                {t('checkout.submit_success_text')}
              </div>

              <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.6, fontSize: 13 }}>
                <div>{t('checkout.security_notes.stripe')}</div>
                <div>{t('checkout.security_notes.immediate')}</div>
                <div>{t('checkout.security_notes.access')}</div>
              </div>

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
