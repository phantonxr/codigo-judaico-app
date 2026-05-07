import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

var STORAGE_KEY = 'cookie_consent'

export default function CookieBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(function () {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  function handleReject() {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label={t('cookie_banner.aria_label')}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(12, 10, 6, 0.97)',
        borderTop: '1px solid rgba(215, 178, 74, 0.25)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        backdropFilter: 'blur(10px)',
      }}
    >
      <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
        {t('cookie_banner.message')}{' '}
        <Link
          to="/politica-de-privacidade"
          style={{ color: 'rgba(215, 178, 74, 0.95)', textDecoration: 'underline' }}
        >
          {t('cookie_banner.policy_link')}
        </Link>
        .
      </p>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={handleReject}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {t('cookie_banner.reject')}
        </button>
        <button
          onClick={handleAccept}
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: 14 }}
        >
          {t('cookie_banner.accept')}
        </button>
      </div>
    </div>
  )
}
