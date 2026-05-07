import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { clearSessionCache } from '../services/sessionSync.js'
import { deletePrivacyAccount, exportPrivacyData, optOutMarketingData } from '../services/privacy.js'
import { readPrivacyConsent, writePrivacyConsent } from '../services/privacyConsent.js'

const offerCheckoutPaths = ['/checkout', '/checkout', '/checkout?plan=anual']

export default function Mais() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const offers = t('more.offers', { returnObjects: true })
  const [privacyStatus, setPrivacyStatus] = useState('')
  const [privacyBusy, setPrivacyBusy] = useState(false)

  function openOffer(path) {
    navigate(path)
  }

  async function handleExportData() {
    if (!currentUser?.id) return

    setPrivacyBusy(true)
    setPrivacyStatus('')

    try {
      const payload = await exportPrivacyData(currentUser.id)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `codigo-judaico-privacy-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setPrivacyStatus(t('more.privacy.export_success'))
    } catch (caught) {
      setPrivacyStatus(String(caught?.message ?? t('more.privacy.export_error')).replace(/^API \d+:\s*/u, ''))
    } finally {
      setPrivacyBusy(false)
    }
  }

  async function handleDeleteAccount() {
    if (!currentUser?.id || !currentUser?.email) return

    const confirmedEmail = window.prompt(t('more.privacy.delete_prompt', { email: currentUser.email }))
    if (confirmedEmail !== currentUser.email) {
      setPrivacyStatus(t('more.privacy.delete_mismatch'))
      return
    }

    setPrivacyBusy(true)
    setPrivacyStatus('')

    try {
      await deletePrivacyAccount(currentUser.id, confirmedEmail)
      clearSessionCache()
      navigate('/')
    } catch (caught) {
      setPrivacyStatus(String(caught?.message ?? t('more.privacy.delete_error')).replace(/^API \d+:\s*/u, ''))
    } finally {
      setPrivacyBusy(false)
    }
  }

  async function handleMarketingOptOut() {
    setPrivacyBusy(true)
    setPrivacyStatus('')

    try {
      const currentConsent = readPrivacyConsent()
      writePrivacyConsent({ ...currentConsent, marketing: false })
      if (currentUser?.id) {
        await optOutMarketingData(currentUser.id)
      }
      setPrivacyStatus(t('more.privacy.marketing_opt_out_success'))
    } catch (caught) {
      setPrivacyStatus(String(caught?.message ?? t('more.privacy.marketing_opt_out_error')).replace(/^API \d+:\s*/u, ''))
    } finally {
      setPrivacyBusy(false)
    }
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title={t('more.title')}
        description={t('more.description')}
      >
        <div className="grid grid-3">
          {Array.isArray(offers) && offers.map((offer, idx) => (
            <div key={offer.title} className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                <div className="offer-image" aria-hidden="true">
                  <div className="offer-image-inner" />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{offer.title}</div>
                  <div className="muted">{offer.description}</div>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => openOffer(offerCheckoutPaths[idx] || '/checkout')}
                >
                  {t('common.buy')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t('more.privacy.title')}
        description={t('more.privacy.description')}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-soft"
            type="button"
            onClick={handleExportData}
            disabled={privacyBusy || !currentUser?.id}
          >
            {t('more.privacy.export_btn')}
          </button>
          <button
            className="btn btn-soft"
            type="button"
            onClick={handleMarketingOptOut}
            disabled={privacyBusy}
          >
            {t('more.privacy.marketing_opt_out_btn')}
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleDeleteAccount}
            disabled={privacyBusy || !currentUser?.id}
            style={{ borderColor: 'rgba(255, 77, 77, 0.42)', color: '#ffc8c8' }}
          >
            {t('more.privacy.delete_btn')}
          </button>
          {privacyStatus ? (
            <div className="muted" role="status" style={{ fontSize: 13 }}>
              {privacyStatus}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
