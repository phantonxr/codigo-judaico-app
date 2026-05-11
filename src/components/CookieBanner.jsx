import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  hasPrivacyConsentChoice,
  isGlobalPrivacyControlEnabled,
  readPrivacyConsent,
  writePrivacyConsent,
} from '../services/privacyConsent.js'

export default function CookieBanner() {
  const { t } = useTranslation()
  const gpcEnabled = isGlobalPrivacyControlEnabled()
  const [visible, setVisible] = useState(() => !hasPrivacyConsentChoice())
  const [expanded, setExpanded] = useState(false)
  const [choices, setChoices] = useState(() => readPrivacyConsent())

  function openPreferences() {
    setChoices(readPrivacyConsent())
    setExpanded(true)
    setVisible(true)
  }

  function handleReject() {
    writePrivacyConsent({ preferences: false, marketing: false })
    setVisible(false)
    setExpanded(false)
  }

  function handleAcceptAll() {
    writePrivacyConsent({ preferences: true, marketing: true })
    setVisible(false)
    setExpanded(false)
  }

  function handleSave() {
    writePrivacyConsent(choices)
    setVisible(false)
    setExpanded(false)
  }

  function toggleChoice(name) {
    setChoices((current) => ({ ...current, [name]: !current[name] }))
  }

  if (!visible) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 14,
          bottom: 14,
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={openPreferences}
          style={{
            border: '1px solid rgba(215, 178, 74, 0.35)',
            background: 'rgba(12, 10, 6, 0.82)',
            color: 'rgba(255,255,255,0.76)',
            borderRadius: 6,
            padding: '7px 10px',
            fontSize: 12,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            textAlign: 'left',
          }}
        >
          {t('cookie_banner.settings')}
        </button>
        <button
          type="button"
          onClick={openPreferences}
          style={{
            border: '1px solid rgba(215, 178, 74, 0.35)',
            background: 'rgba(12, 10, 6, 0.82)',
            color: 'rgba(215,178,74,0.72)',
            borderRadius: 6,
            padding: '7px 10px',
            fontSize: 11,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            textAlign: 'left',
          }}
        >
          {t('cookie_banner.do_not_sell')}
        </button>
      </div>
    )
  }

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
        padding: '16px clamp(12px, 4vw, 24px)',
        display: 'flex',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'grid', gap: 10, flex: '1 1 280px' }}>
        <p style={{ margin: 0, minWidth: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
          {t('cookie_banner.message')}{' '}
          <Link
            to="/politica-de-privacidade"
            style={{ color: 'rgba(215, 178, 74, 0.95)', textDecoration: 'underline' }}
          >
            {t('cookie_banner.policy_link')}
          </Link>
          .
        </p>

        {expanded ? (
          <div style={{ display: 'grid', gap: 8, maxWidth: 780 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
              <input type="checkbox" checked disabled style={{ marginTop: 2 }} />
              <span>
                <strong style={{ color: 'rgba(255,255,255,0.86)' }}>{t('cookie_banner.essential_title')}</strong>
                {' '}{t('cookie_banner.essential_description')}
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
              <input
                type="checkbox"
                checked={choices.preferences}
                onChange={() => toggleChoice('preferences')}
                style={{ marginTop: 2, accentColor: 'var(--gold-2)' }}
              />
              <span>
                <strong style={{ color: 'rgba(255,255,255,0.86)' }}>{t('cookie_banner.preferences_title')}</strong>
                {' '}{t('cookie_banner.preferences_description')}
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
              <input
                type="checkbox"
                checked={choices.marketing}
                disabled={gpcEnabled}
                onChange={() => toggleChoice('marketing')}
                style={{ marginTop: 2, accentColor: 'var(--gold-2)' }}
              />
              <span>
                <strong style={{ color: 'rgba(255,255,255,0.86)' }}>{t('cookie_banner.marketing_title')}</strong>
                {' '}{t('cookie_banner.marketing_description')}
                {gpcEnabled ? ` ${t('cookie_banner.gpc_enabled')}` : ''}
              </span>
            </label>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 10, flex: '1 1 260px', minWidth: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
        {expanded ? (
          <button
            onClick={handleSave}
            className="btn btn-soft"
            style={{ padding: '8px 18px', fontSize: 14 }}
          >
            {t('cookie_banner.save')}
          </button>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="btn btn-soft"
            style={{ padding: '8px 18px', fontSize: 14 }}
          >
            {t('cookie_banner.customize')}
          </button>
        )}
        <button
          onClick={handleAcceptAll}
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: 14 }}
        >
          {t('cookie_banner.accept_all')}
        </button>
      </div>
    </div>
  )
}
