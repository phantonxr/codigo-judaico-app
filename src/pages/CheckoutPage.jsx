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
  getLegalDocumentLabel,
  normalizeLegalLanguage,
} from '../services/legal.js'
import { useUtmParams } from '../hooks/useUtmParams.js'
import { hasMarketingConsent } from '../services/privacyConsent.js'
import DisclaimerBanner from '../components/legal/DisclaimerBanner.jsx'
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

  const isPrimaryOffer = selectedPlan.id === 'primeiro-acesso'
  const submitLabel = isPrimaryOffer ? 'QUERO MEU ACESSO' : ctaLabel

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

  const toastPool = useMemo(
    function () {
      if (!isPrimaryOffer) return []

      return [
        {
          type: 'social',
          icon: <Sparkles size={16} />,
          title: 'Prova social',
          message: 'Fernanda M. acabou de garantir o acesso.',
        },
        {
          type: 'social',
          icon: <Sparkles size={16} />,
          title: 'Prova social',
          message: 'Jorge F. iniciou a jornada de 21 dias.',
        },
        {
          type: 'social',
          icon: <Sparkles size={16} />,
          title: 'Prova social',
          message: 'Luciana T. acabou de liberar o acesso.',
        },
        {
          type: 'social',
          icon: <Sparkles size={16} />,
          title: 'Prova social',
          message: 'Paulo D. garantiu o desconto promocional.',
        },
        {
          type: 'social',
          icon: <Sparkles size={16} />,
          title: 'Prova social',
          message: 'Lucas U. começou agora com o Rabino Mentor IA.',
        },
        {
          type: 'scarcity',
          icon: <Flame size={16} />,
          title: 'Escassez',
          message: 'Restam apenas 7 acessos promocionais.',
        },
        {
          type: 'scarcity',
          icon: <Clock size={16} />,
          title: 'Escassez',
          message: 'Desconto reservado por poucos minutos.',
        },
        {
          type: 'scarcity',
          icon: <Clock size={16} />,
          title: 'Escassez',
          message: 'Os acessos promocionais podem encerrar a qualquer momento.',
        },
        {
          type: 'benefit',
          icon: <Sparkles size={16} />,
          title: 'Benefício',
          message: 'Usuários estão identificando seus gatilhos com o Rabino Mentor IA.',
        },
        {
          type: 'benefit',
          icon: <Sparkles size={16} />,
          title: 'Benefício',
          message: 'O método começa pelo domínio do comportamento, não por planilhas.',
        },
      ]
    },
    [isPrimaryOffer],
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
      setError(legalError || 'Legal documents are not available yet. Please try again in a moment.')
      return
    }

    if (!acceptedLegal) {
      setError('Please agree to the Terms of Service, Privacy Policy, and Disclaimer before continuing.')
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
        <div ref={planSectionRef} />
        <DisclaimerBanner compact />

        <div className="card">
          <div className="card-inner checkout-hero">
            {isPrimaryOffer ? (
              <>
                <span className="badge" style={{ width: 'fit-content' }}>
                  Oferta de acesso inicial
                </span>

                <h1 className="checkout-hero-title">
                  21 dias para descobrir o gatilho invisível que faz seu dinheiro desaparecer
                </h1>

                <div className="checkout-subheadline">
                  <div className="checkout-subheadline__icon" aria-hidden="true">
                    <Sparkles size={16} />
                  </div>
                  <div className="checkout-subheadline__text">
                    Com atividades diárias simples e acompanhamento do{' '}
                    <span className="checkout-emphasis">Rabino Mentor IA</span>, você vai investigar o padrão emocional que faz seu dinheiro escapar — e começar a desenvolver{' '}
                    <span className="checkout-emphasis">domínio</span> sobre ele.
                  </div>
                </div>

                <div className="checkout-hero-quote">
                  “O problema não é apenas quanto você ganha. É o padrão invisível que decide por você antes mesmo de perceber.”
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
                  <div className="checkout-price-from">De R$97,90</div>
                  <div className="checkout-price-to">
                    <span className="checkout-price-prefix">por</span>
                    <strong>R$29,90</strong>
                  </div>
                </div>

                <div className="checkout-alert" role="note" aria-label="Urgência">
                  <div className="checkout-alert__icon" aria-hidden="true">
                    <Flame size={16} />
                  </div>
                  <div className="checkout-alert__body">
                    <div className="checkout-alert__title">🔥 Desconto liberado por poucos minutos</div>
                    <div className="checkout-alert__text">
                      Restam apenas <span className="checkout-emphasis">7</span> acessos promocionais disponíveis hoje.
                    </div>
                  </div>
                </div>

                <div className={'checkout-timer' + (isUrgentWindow ? ' checkout-timer--urgent' : '')}>
                  <div className="checkout-timer__icon" aria-hidden="true">
                    <Clock size={16} />
                  </div>
                  <div className="checkout-timer__content">
                    <div className="checkout-timer__label">Desconto reservado por:</div>
                    <div className="checkout-timer__time" aria-label={`Desconto reservado por ${countdownLabel}`}>{countdownLabel}</div>
                  </div>
                </div>

                <div className="checkout-bullets" aria-label="Principais benefícios">
                  <div className="checkout-bullet">✅ Acesso imediato por 21 dias</div>
                  <div className="checkout-bullet">✅ Atividades diárias simples (sem burocracia)</div>
                  <div className="checkout-bullet">✅ Acompanhamento do Rabino Mentor IA</div>
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
                O que está incluído no seu acesso
              </div>
              <div className="checkout-includes">
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">Jornada de 21 dias</div>
                  <div className="checkout-mini-card-text">Atividades simples e práticas para observar seus padrões financeiros todos os dias.</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">Rabino Mentor IA</div>
                  <div className="checkout-mini-card-text">Um mentor inteligente que acompanha suas respostas e ajuda a identificar seu principal gatilho.</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">Avaliação e autoavaliação</div>
                  <div className="checkout-mini-card-text">Você entende como emoções, estresse, medo, comparação ou impulsos afetam seu dinheiro.</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">Diagnóstico do gatilho principal</div>
                  <div className="checkout-mini-card-text">Ao longo da jornada, o sistema ajuda a revelar o padrão que mais faz seu dinheiro desaparecer.</div>
                </div>
                <div className="checkout-mini-card">
                  <div className="checkout-mini-card-title">Domínio dos impulsos</div>
                  <div className="checkout-mini-card-text">Você aprende a reconhecer o gatilho antes que ele controle suas próximas decisões.</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isPrimaryOffer ? (
          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                O que as pessoas dizem
              </div>
              <div className="checkout-testimonials">
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">Fernanda M. — Rio de Janeiro</div>
                  <div className="checkout-testimonial-text">“Nunca imaginei que meus gastos estavam ligados ao estresse do trabalho. O Rabino Mentor IA conseguiu identificar isso e hoje consigo dominar melhor esse padrão.”</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">Jorge F. — Bahia</div>
                  <div className="checkout-testimonial-text">“Estava endividado e preso em empréstimos e juros altos. Com o Rabino Mentor IA, comecei a entender meus hábitos sem precisar viver guardando cada centavo.”</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">Lucas U. — Rio Grande do Sul</div>
                  <div className="checkout-testimonial-text">“Esse app é sensacional. Ele não te faz apenas guardar dinheiro. Ele faz você mudar de vida.”</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">Luciana T. — Amapá</div>
                  <div className="checkout-testimonial-text">“As atividades diárias foram tão naturais que eu nem percebi quando minha rotina começou a mudar. Hoje minha família também usa o método.”</div>
                </div>
                <div className="checkout-testimonial">
                  <div className="checkout-stars">⭐⭐⭐⭐⭐</div>
                  <div className="checkout-testimonial-name">Paulo D. — Minas Gerais</div>
                  <div className="checkout-testimonial-text">“Trabalhava de Uber e 99 para complementar renda e vivia no limite. Depois que comecei a aplicar os ensinamentos judaicos, minha família mudou e hoje até consigo investir.”</div>
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
              <div style={{ fontWeight: 950, fontSize: 16 }}>Garantia de 7 dias</div>
              <div className="muted" style={{ lineHeight: 1.7 }}>
                Você pode acessar, testar e começar sua jornada. Se não fizer sentido para você, pode solicitar reembolso dentro do prazo de garantia.
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
                    Tenha uma visão estratégica de construção de bens
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  Adicione os métodos abaixo e aprofunde sua compreensão sobre prosperidade financeira, legado e construção de patrimônio com visão estratégica — seguindo princípios de domínio, consciência e visão de mercado inspirados na tradição judaica.
                  {'\n'}
                  {'\n'}
                  Esses materiais complementares foram criados para ajudar você a enxergar o dinheiro com mais clareza, tomar decisões com mais domínio e construir patrimônio sem viver preso à escassez.
                </div>

                <div className={'checkout-book-promo' + (hasMethodBookSelected ? ' checkout-book-promo--active' : '')}>
                  <div className="checkout-book-promo__icon" aria-hidden="true">
                    <Gift size={17} />
                  </div>
                  <div className="checkout-book-promo__copy">
                    <div className="checkout-book-promo__title">Desbloqueio inteligente</div>
                    <div className="checkout-book-promo__text">
                      {hasMethodBookSelected
                        ? 'Método principal adicionado — os 2 conteúdos especiais sobre gatilhos invisíveis foram desbloqueados sem custo adicional.'
                        : 'Adicione o método principal e receba 2 materiais complementares desbloqueados sem custo adicional para acelerar sua clareza sobre os gatilhos invisíveis do dinheiro.'}
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
                              {isMethodBook ? <span className="checkout-book-mini-badge">Método principal</span> : null}
                              {isFreeWithMethod ? (
                                <span className="checkout-book-mini-badge checkout-book-mini-badge--free">Bônus incluído</span>
                              ) : null}
                            </div>
                            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{book.description}</div>
                            {isFreeWithMethod ? (
                              <div className="checkout-book-free-price">
                                <span>{book.priceLabel}</span>
                                <strong>Desbloqueado sem custo adicional</strong>
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
                  {isPrimaryOffer ? 'Crie seu acesso para iniciar sua jornada de 21 dias.' : (existingAccountFlow ? t('checkout.form_title_existing') : t('checkout.form_title_new'))}
                </div>
                <div className="muted" style={{ lineHeight: 1.6 }}>
                  {existingAccountFlow
                    ? t('checkout.existing_account')
                    : (isPrimaryOffer
                      ? 'Leva menos de 1 minuto. Depois você finaliza o pagamento em ambiente seguro do Stripe.'
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
                {loading ? t('checkout.submit_loading') : submitLabel}
              </button>

              {isPrimaryOffer ? (
                <div className="checkout-cta-notes" aria-label="Payment reassurance">
                  <div>🔒 Pagamento seguro via Stripe</div>
                  <div>⚡ Acesso imediato</div>
                  <div>✅ Atividades diárias + Rabino Mentor IA</div>
                </div>
              ) : (
                <div className="checkout-cta-notes" aria-label="Payment reassurance">
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
