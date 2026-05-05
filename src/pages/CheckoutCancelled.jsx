import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function CheckoutCancelled() {
  const { t } = useTranslation()

  return (
    <div className="container" style={{ padding: '48px 0 72px' }}>
      <div className="card" style={{ maxWidth: 680, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <span className="badge" style={{ width: 'fit-content' }}>{t('checkout_cancelled.badge')}</span>
          <h1 style={{ margin: 0, fontSize: 30 }}>{t('checkout_cancelled.title')}</h1>
          <div className="muted">
            {t('checkout_cancelled.description')}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/checkout">
              {t('checkout_cancelled.try_again')}
            </Link>
            <Link className="btn" to="/">
              {t('checkout_cancelled.back_to_landing')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
