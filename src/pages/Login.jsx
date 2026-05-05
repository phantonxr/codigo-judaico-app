import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { readCurrentUser, signInUser } from '../hooks/useCurrentUser.js'

function buildCheckoutRedirect(errorData, email) {
  const params = new URLSearchParams()

  if (errorData?.email || email) {
    params.set('email', errorData?.email || email)
  }

  if (errorData?.planId) {
    params.set('plan', errorData.planId)
  }

  params.set('reason', 'payment_required')

  return `/checkout?${params.toString()}`
}

function toFriendlyLoginError(caught, t) {
  if (caught?.status === 401) {
    return t('auth.login.errors.invalid_credentials')
  }

  const raw =
    caught?.data?.detail ||
    caught?.data?.message ||
    caught?.message ||
    t('auth.login.errors.generic')
  const normalized = String(raw).replace(/^API \d+:\s*/u, '').trim()

  if (/credenciais invalidas/i.test(normalized)) {
    return t('auth.login.errors.invalid_credentials')
  }

  return normalized
}

export default function Login() {
  const { t } = useTranslation()
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
    } catch (caught) {
      if (caught?.status === 403 && caught?.data?.code === 'checkout_required') {
        navigate(buildCheckoutRedirect(caught.data, email), { replace: true })
        return
      }
      setError(toFriendlyLoginError(caught, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('auth.login.title')}</div>
            <div className="muted">
              {t('auth.login.description')}
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="email">{t('auth.login.email')}</label>
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
              <label htmlFor="password">{t('auth.login.password')}</label>
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
              {loading ? t('auth.login.loading') : t('auth.login.submit')}
            </button>
            <Link className="btn btn-soft" to="/esqueci-senha">
              {t('auth.login.forgot_password')}
            </Link>
            <Link className="btn btn-soft" to="/checkout">
              {t('auth.login.no_access')}
            </Link>
            <Link className="btn" to="/">
              {t('auth.login.back_to_landing')}
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
