import * as Sentry from '@sentry/react'
import React from 'react'
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import {
  readPrivacyConsent,
  PRIVACY_CONSENT_CHANGED_EVENT,
} from './services/privacyConsent.js'

// Session Replay records screen content → only enable with "preferences" consent.
function hasReplayConsent() {
  return readPrivacyConsent().preferences === true
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,

  // Never send cookies, auth headers, or IP addresses automatically.
  // PII (e.g. user email) may be attached explicitly only where needed,
  // after verifying that the appropriate consent category is active.
  sendDefaultPii: false,

  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      matchRoutes,
      createRoutesFromChildren,
    }),
    Sentry.replayIntegration({
      // Mask all text and block all media by default so that even if replay
      // starts unexpectedly no readable content is captured.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/api\.codigomilenarjudaico\.com/,
  ],

  // Session Replay sample rates: 0 until the user grants preferences consent.
  replaysSessionSampleRate: hasReplayConsent() ? 0.1 : 0,
  replaysOnErrorSampleRate: hasReplayConsent() ? 1.0 : 0,
})

// Stop replay immediately on load if consent has not been granted yet.
if (!hasReplayConsent()) {
  Sentry.getReplay()?.stop()
}

// Dynamically start/stop replay whenever the user updates their consent choices.
window.addEventListener(PRIVACY_CONSENT_CHANGED_EVENT, (event) => {
  const replay = Sentry.getReplay()
  if (!replay) return
  if (event.detail?.preferences) {
    replay.start()
  } else {
    replay.stop()
  }
})
