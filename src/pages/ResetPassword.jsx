import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resetPassword } from '../services/sessionSync.js'

const MINIMUM_PASSWORD_LENGTH = 8

export default function ResetPassword() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const token = params.get('token') ?? ''

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!token) {
      setError(t('auth.reset_password.errors.invalid_link'))
      return
    }

    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      setError(t('auth.reset_password.errors.too_short', { min: MINIMUM_PASSWORD_LENGTH }))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.reset_password.errors.mismatch'))
      return
    }

    setLoading(true)
    try {
      await resetPassword({ token, password })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (caught) {
      const message =
        caught?.data?.detail ||
        caught?.data?.message ||
        t('auth.reset_password.errors.generic')
      setError(String(message).replace(/^API \d+:\s*/u, ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('auth.reset_password.title')}</div>
            <div className="muted">{t('auth.reset_password.description')}</div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="password">{t('auth.reset_password.new_password')}</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">{t('auth.reset_password.confirm_password')}</label>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
                {t('auth.reset_password.success')}
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t('auth.reset_password.loading') : t('auth.reset_password.submit')}
            </button>
            <Link className="btn" to="/login">
              {t('auth.reset_password.back_to_login')}
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
