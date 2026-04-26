import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { createCheckoutSession } from '../services/payments.js'
import { useUtmParams } from '../hooks/useUtmParams.js'
import FloatingProof from '../components/FloatingProof.jsx'
import { Zap, Clock } from 'lucide-react'

const MINIMUM_PASSWORD_LENGTH = 8
const DEFAULT_PLAN_ID = 'primeiro-acesso'

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

function resolveAccessLabel(planId) {
  var pid = String(planId || '')
  if (pid === 'mensal') return '1 mês de acesso completo'
  if (pid === 'anual') return '12 meses de acesso completo'
  if (pid === 'vitalicio') return 'Acesso vitalício ao método'
  return '21 dias de acesso completo'
}

function resolvePhaseLabel(planTitle) {
  var title = String(planTitle || '')
  var parts = title.split('—')
  var left = String(parts[0] || '').trim()
  return left || title
}

function resolvePromise(planId) {
  var pid = String(planId || '')
  if (pid === 'mensal') {
    return 'Você continua avançando: identifica o impulso, corrige o padrão e sustenta decisões financeiras mais conscientes.'
  }
  if (pid === 'anual') {
    return 'Você consolida o domínio financeiro por 12 meses, reforçando hábitos e eliminando recaídas de impulso.'
  }
  if (pid === 'vitalicio') {
    return 'Você garante acesso permanente ao método para evoluir no seu ritmo e voltar sempre que precisar recalibrar.'
  }
  return 'Em 21 dias, você começa a enxergar os gatilhos invisíveis que fazem seu dinheiro escapar — e inicia o domínio sobre suas decisões financeiras.'
}

function resolveCtaLabel(planId) {
  var pid = String(planId || '')
  if (pid === 'primeiro-acesso' || pid === 'renovacao') return 'Liberar meu acesso de 21 dias agora'
  return 'Liberar meu acesso agora'
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const selectedPlan = resolvePlan(searchParams.get('plan'))
  const accessLabel = resolveAccessLabel(selectedPlan.id)
  const phaseLabel = resolvePhaseLabel(selectedPlan.title)
  const promise = resolvePromise(selectedPlan.id)
  const ctaLabel = resolveCtaLabel(selectedPlan.id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const redirectedFromLogin = searchParams.get('reason') === 'payment_required'
  const existingAccountFlow = redirectedFromLogin && Boolean(email)

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

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!existingAccountFlow && password.trim().length < MINIMUM_PASSWORD_LENGTH) {
      setError(`Crie uma senha com pelo menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (!existingAccountFlow && password !== passwordConfirmation) {
      setError('A confirmação da senha não confere.')
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
      })

      if (!response?.url) {
        throw new Error('Checkout sem URL.')
      }

      window.location.href = response.url
    } catch (caught) {
      const nextError =
        caught?.data?.detail ||
        caught?.data?.message ||
        caught?.message ||
        'Nao consegui abrir o checkout agora. Tente novamente em instantes.'
      setError(
        String(nextError).replace(/^API \d+:\s*/u, ''),
      )
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 72px' }}>
      <FloatingProof />

      <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gap: 22 }}>
        <div className="card">
          <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
            <span className="badge" style={{ width: 'fit-content' }}>Checkout oficial via Stripe</span>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05 }}>
              Desbloqueie o Método Judaico da Prosperidade
            </h1>
            <div style={{ fontWeight: 900, color: 'var(--gold-2)', lineHeight: 1.35 }}>
              Mais de 1.247 pessoas já iniciaram essa jornada
            </div>
            <div className="muted" style={{ lineHeight: 1.7 }}>
              {existingAccountFlow
                ? 'Sua conta já foi encontrada. Falta só concluir o pagamento para liberar o acesso.'
                : 'Crie sua conta agora. Assim que o Stripe confirmar, a liberação acontece imediatamente.'}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 22 }}>
          <div className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.85)' }}>
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
                <strong style={{ fontSize: 18 }}>{selectedPlan.title}</strong>
                <span className="badge">{selectedPlan.highlight}</span>
              </div>

              <div className="checkout-promise">
                {promise}
              </div>

              <div style={{ fontWeight: 900, fontSize: 28, color: 'var(--gold-2)' }}>
                {selectedPlan.price}
              </div>

              <div className="checkout-benefits">
                <div className="checkout-benefit">✔ Identifique seus gatilhos de gasto</div>
                <div className="checkout-benefit">✔ Receba orientação do Rabino Mentor IA</div>
                <div className="checkout-benefit">✔ Comece sua jornada de domínio financeiro</div>
              </div>

              <div className="muted" style={{ display: 'grid', gap: 4, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, color: 'rgba(255,255,255,0.85)' }}>{accessLabel}</div>
                <div>
                  Fase inicial: <strong style={{ color: 'var(--gold-2)' }}>{phaseLabel}</strong>
                </div>
                <div style={{ maxWidth: 640 }}>{selectedPlan.subtitle}</div>
              </div>

              <div className="checkout-window-alert">
                <div className="checkout-window-alert__title">
                  ⚠️ ESTE VALOR ESTÁ DISPONÍVEL SOMENTE NESTA JANELA DE ACESSO.
                </div>
                <div className="checkout-window-alert__sub">
                  APÓS O ENCERRAMENTO, A PRÓXIMA LIBERAÇÃO PODE VOLTAR COM OUTRO VALOR.
                </div>
              </div>

              <div className={'checkout-timer' + (isUrgentWindow ? ' checkout-timer--urgent' : '')}>
                <div className="checkout-timer__icon" aria-hidden="true">
                  {isUrgentWindow ? <Clock size={16} /> : <Zap size={16} />}
                </div>
                <div className="checkout-timer__content">
                  <div className="checkout-timer__title">
                    {isUrgentWindow ? '⚠️ ÚLTIMOS MINUTOS PARA MANTER ESSE VALOR' : '⚡ JANELA DE ACESSO COM VALOR REDUZIDO'}
                  </div>
                  <div className="checkout-timer__label">
                    {isUrgentWindow ? 'TEMPO RESTANTE:' : 'ESSE VALOR FICA RESERVADO POR:'}
                  </div>
                  <div className="checkout-timer__time" aria-label={`Tempo restante ${countdownLabel}`}>{countdownLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {existingAccountFlow ? 'Conta encontrada' : 'Dados para liberar o acesso'}
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
                >
                  Vamos continuar com <strong>{email}</strong> e com a senha que voce ja cadastrou.
                  Agora falta so finalizar o checkout para ativar o acesso.
                </div>
              ) : null}

              {existingAccountFlow ? null : (
                <div className="field">
                  <label htmlFor="checkout-name">Nome</label>
                  <input
                    id="checkout-name"
                    className="input"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Como devemos te chamar"
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="checkout-email">E-mail</label>
                <input
                  id="checkout-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  readOnly={existingAccountFlow}
                  required
                />
              </div>

              {existingAccountFlow ? null : (
                <div className="field">
                  <label htmlFor="checkout-password">Senha</label>
                  <input
                    id="checkout-password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Crie sua senha de acesso"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {existingAccountFlow ? null : (
                <div className="field">
                  <label htmlFor="checkout-password-confirmation">Confirmar senha</label>
                  <input
                    id="checkout-password-confirmation"
                    className="input"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              <div className="muted">
                {existingAccountFlow ? (
                  <>
                    O login sera liberado para <strong>{email}</strong> assim que o Stripe confirmar o pagamento.
                  </>
                ) : (
                  <>
                    Sua conta sera criada para <strong>{email || 'o e-mail informado acima'}</strong>.
                    O login sera liberado depois da confirmacao do Stripe, usando a senha criada acima.
                  </>
                )}
              </div>

              {existingAccountFlow ? (
                <div className="muted" style={{ fontSize: 14 }}>
                  Se quiser usar outro e-mail, abra um checkout novo em{' '}
                  <Link to={buildFreshCheckoutPath(selectedPlan.id)}>usar outra conta</Link>.
                </div>
              ) : null}

              {error ? (
                <div className="muted" style={{ color: '#f3b0b0' }}>
                  {error}
                </div>
              ) : null}

              <button className="btn btn-primary btn-block btn-mentor-glow" type="submit" disabled={loading} style={{ padding: '14px 16px', fontSize: 16 }}>
                {loading
                  ? 'Abrindo checkout...'
                  : ctaLabel}
              </button>

              <div className="muted" style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
                Seu acesso começa após a confirmação segura do pagamento.
              </div>

              <div className="muted" style={{ display: 'grid', gap: 6, lineHeight: 1.6, fontSize: 13 }}>
                <div>🔒 Pagamento 100% seguro via Stripe</div>
                <div>✔ Liberação imediata após confirmação</div>
                <div>🔑 Acesso com e-mail e senha</div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn" to="/">
                  Voltar para a landing
                </Link>
                <Link className="btn btn-soft" to="/login">
                  {existingAccountFlow ? 'Voltar ao login' : 'Ja tenho conta'}
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
