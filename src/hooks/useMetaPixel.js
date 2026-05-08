import { useEffect } from 'react'
import { hasMarketingConsent, PRIVACY_CONSENT_CHANGED_EVENT } from '../services/privacyConsent.js'

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID

function injectAndInit() {
  if (!PIXEL_ID || window._cjFbPixelReady) return

  if (!window.fbq) {
    const n = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    })
    if (!window._fbq) window._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)
  }

  window.fbq('init', PIXEL_ID)
  window.fbq('track', 'PageView')
  window._cjFbPixelReady = true
}

export function useMetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID) return

    if (hasMarketingConsent()) {
      injectAndInit()
    }

    const onConsentChange = () => {
      if (hasMarketingConsent()) injectAndInit()
    }

    window.addEventListener(PRIVACY_CONSENT_CHANGED_EVENT, onConsentChange)
    return () => window.removeEventListener(PRIVACY_CONSENT_CHANGED_EVENT, onConsentChange)
  }, [])
}
