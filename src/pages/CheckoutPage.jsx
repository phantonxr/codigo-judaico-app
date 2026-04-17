import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { createCheckoutSession } from '../services/payments.js'

const plans = [
  {
    id: 'mensal',
    title: 'Plano Mensal',
    highlight: 'Preco especial',
    oldPrice: 'R$ 29,90',
    price: 'R$ 17,90 no primeiro mes',
    subtitle: 'E depois R$ 29,90 / mes',
  },
  {
    id: 'anual',
    title: 'Plano Anual',
    price: 'R$ 297,00 / ano',
    subtitle: 'Acesso premium por 12 meses',
  },
]

function findPlan(planId) {
  return plans.find((plan) => plan.id === planId) ?? plans[0]
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const [selectedPlan, setSelectedPlan] = useState(() => findPlan(searchParams.get('plan')).id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentPlan = useMemo(() => findPlan(selectedPlan), [selectedPlan])

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await createCheckoutSession({
        name,
        email,
        planId: selectedPlan,
      })

      if (!response?.url) {
        throw new Error('Checkout sem URL.')
      }

      window.location.href = response.url
    } catch {
      setError('Nao consegui abrir o checkout agora. Tente novamente em instantes.')
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
              Desbloqueie o Metodo Judaico da Prosperidade
            </h1>
            <div className="muted">
              Depois da confirmacao do pagamento, liberamos o acesso para o e-mail informado e enviamos a senha automaticamente.
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 18 }}>
          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Escolha seu plano</div>

              <div style={{ display: 'grid', gap: 12 }}>
                {plans.map((plan) => {
                  const selected = plan.id === selectedPlan
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className="card"
                      onClick={() => setSelectedPlan(plan.id)}
                      style={{
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderColor: selected ? 'rgba(215, 178, 74, 0.85)' : 'rgba(255,255,255,0.08)',
                        background: selected
                          ? 'linear-gradient(180deg, rgba(215, 178, 74, 0.14), rgba(255,255,255,0.04))'
                          : undefined,
                      }}
                    >
                      <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span
                              aria-hidden="true"
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: selected ? '5px solid var(--gold-2)' : '2px solid rgba(255,255,255,0.25)',
                                display: 'inline-block',
                              }}
                            />
                            <strong style={{ fontSize: 16 }}>{plan.title}</strong>
                          </div>
                          {plan.highlight ? <span className="badge">{plan.highlight}</span> : null}
                        </div>

                        <div style={{ display: 'grid', gap: 4, paddingLeft: 30 }}>
                          {plan.oldPrice ? (
                            <div className="muted" style={{ textDecoration: 'line-through' }}>
                              {plan.oldPrice}
                            </div>
                          ) : null}
                          <div style={{ fontWeight: 900, fontSize: 24, color: 'var(--gold-2)' }}>
                            {plan.price}
                          </div>
                          <div className="muted">{plan.subtitle}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Dados para liberar o acesso</div>

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

              <div className="field">
                <label htmlFor="checkout-email">E-mail</label>
                <input
                  id="checkout-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                />
              </div>

              <div className="muted">
                O acesso sera liberado para <strong>{email || 'o e-mail informado acima'}</strong>.
                A senha temporaria sera enviada para esse mesmo endereco.
              </div>

              {error ? (
                <div className="muted" style={{ color: '#f3b0b0' }}>
                  {error}
                </div>
              ) : null}

              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? 'Abrindo checkout...' : `Continuar com ${currentPlan.title}`}
              </button>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn" to="/">
                  Voltar para a landing
                </Link>
                <Link className="btn btn-soft" to="/login">
                  Ja recebi minha senha
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
