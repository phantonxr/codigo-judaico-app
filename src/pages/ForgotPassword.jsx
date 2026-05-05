import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { requestPasswordReset } from '../services/sessionSync.js'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await requestPasswordReset(email)
      setSuccess(true)
    } catch {
      setError(t('auth.forgot_password.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('auth.forgot_password.title')}</div>
            <div className="muted">
              {t('auth.forgot_password.description')}
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="email">{t('auth.forgot_password.email')}</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="muted" style={{ color: '#f3b0b0' }}>
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="muted" style={{ color: '#c7f3b0' }}>
                {t('auth.forgot_password.success')}
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t('auth.forgot_password.loading') : t('auth.forgot_password.submit')}
            </button>
            <Link className="btn" to="/login">
              {t('auth.forgot_password.back_to_login')}
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
