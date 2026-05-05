import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCheckoutSessionStatus } from '../services/payments.js'

export default function CheckoutSuccess() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError(t('checkout_success.errors.no_session'))
      return
    }

    let active = true
    let timeoutId

    async function poll(attempt = 0) {
      try {
        const data = await getCheckoutSessionStatus(sessionId)

        if (!active) return

        setStatus(data)
        setError('')

        if (data?.accessGranted || attempt >= 9) {
          setLoading(false)
          return
        }

        timeoutId = window.setTimeout(() => {
          poll(attempt + 1)
        }, 3000)
      } catch {
        if (!active) return

        if (attempt >= 4) {
          setError(t('checkout_success.errors.status_error'))
          setLoading(false)
          return
        }

        timeoutId = window.setTimeout(() => {
          poll(attempt + 1)
        }, 3000)
      }
    }

    poll()

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [sessionId, t])

  return (
    <div className="container" style={{ padding: '48px 0 72px' }}>
      <div className="card" style={{ maxWidth: 720, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 16 }}>
          <span className="badge" style={{ width: 'fit-content' }}>{t('checkout_success.badge')}</span>
          <h1 style={{ margin: 0, fontSize: 30 }}>{t('checkout_success.title')}</h1>

          {loading ? (
            <div className="muted">
              {t('checkout_success.loading')}
            </div>
          ) : error ? (
            <div className="muted" style={{ color: '#f3b0b0' }}>{error}</div>
          ) : (
            <>
              <div className="muted">
                {status?.accessGranted
                  ? t('checkout_success.access_granted', { email: status?.email || t('checkout_success.access_email_fallback') })
                  : t('checkout_success.pending')}
              </div>
              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 6 }}>
                  <div><strong>{t('checkout_success.plan_label')}</strong> {status?.planName || t('checkout_success.plan_default')}</div>
                  <div><strong>{t('checkout_success.email_label')}</strong> {status?.email || t('checkout_success.email_not_provided')}</div>
                  <div><strong>{t('checkout_success.status_label')}</strong> {status?.paymentStatus || t('checkout_success.status_processing')}</div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/login">
              {t('checkout_success.go_to_login')}
            </Link>
            <Link className="btn" to="/checkout">
              {t('checkout_success.back_to_checkout')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
