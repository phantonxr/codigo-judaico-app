import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { readCurrentUser, signInUser } from '../hooks/useCurrentUser.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => readCurrentUser().email || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signInUser({ email, password })
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch {
      setError('Nao consegui entrar. Confira o e-mail, a senha e se o acesso ja foi liberado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Login</div>
            <div className="muted">
              Entre com o e-mail liberado no pagamento. A senha chega por e-mail apos a confirmacao no Stripe.
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="muted" style={{ color: '#f3b0b0' }}>
                {error}
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <Link className="btn btn-soft" to="/checkout">
              Ainda nao tenho acesso
            </Link>
            <Link className="btn" to="/">
              Voltar para a Landing
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
