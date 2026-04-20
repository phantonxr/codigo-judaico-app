import { Link, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { createCheckoutSession } from '../services/payments.js'

const MINIMUM_PASSWORD_LENGTH = 8

const PRIMEIRO_ACESSO_PLAN = {
  id: 'primeiro-acesso',
  title: 'Primeiro Acesso',
  price: 'R$ 29,90',
  subtitle: '21 dias de acesso completo',
  highlight: 'Oferta de entrada',
}

function buildFreshCheckoutPath() {
  return '/checkout'
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const redirectedFromLogin = searchParams.get('reason') === 'payment_required'
  const existingAccountFlow = redirectedFromLogin && Boolean(email)

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!existingAccountFlow && password.trim().length < MINIMUM_PASSWORD_LENGTH) {
      setError(`Crie uma senha com pelo menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (!existingAccountFlow && password !== passwordConfirmation) {
      setError('A confirmacao da senha nao confere.')
      return
    }

    setLoading(true)

    try {
      const response = await createCheckoutSession({
        name,
        email,
        planId: PRIMEIRO_ACESSO_PLAN.id,
        password,
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
      <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gap: 18 }}>
        <div className="card">
          <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
            <span className="badge" style={{ width: 'fit-content' }}>Checkout oficial via Stripe</span>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05 }}>
              {existingAccountFlow
                ? 'Finalize sua assinatura'
                : 'Desbloqueie o Metodo Judaico da Prosperidade'}
            </h1>
            <div className="muted">
              {existingAccountFlow
                ? 'Sua conta ja foi encontrada. Agora falta so concluir o pagamento para liberar o acesso.'
                : 'Crie sua conta agora com e-mail e senha. Assim que o pagamento for confirmado, liberamos o login no mesmo instante.'}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 18 }}>
          <div className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.85)' }}>
            <div
              className="card-inner"
              style={{
                background: 'linear-gradient(180deg, rgba(215, 178, 74, 0.14), rgba(255,255,255,0.04))',
                display: 'grid',
                gap: 10,
                borderRadius: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <strong style={{ fontSize: 18 }}>{PRIMEIRO_ACESSO_PLAN.title}</strong>
                <span className="badge">{PRIMEIRO_ACESSO_PLAN.highlight}</span>
              </div>
              <div style={{ fontWeight: 900, fontSize: 28, color: 'var(--gold-2)' }}>
                {PRIMEIRO_ACESSO_PLAN.price}
              </div>
              <div className="muted">{PRIMEIRO_ACESSO_PLAN.subtitle}</div>
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
                  <Link to={buildFreshCheckoutPath()}>usar outra conta</Link>.
                </div>
              ) : null}

              {error ? (
                <div className="muted" style={{ color: '#f3b0b0' }}>
                  {error}
                </div>
              ) : null}

              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading
                  ? 'Abrindo checkout...'
                  : existingAccountFlow
                    ? 'Finalizar Primeiro Acesso'
                    : 'Continuar para o pagamento'}
              </button>

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
