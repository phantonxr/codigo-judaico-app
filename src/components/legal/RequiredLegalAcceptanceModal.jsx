import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DisclaimerBanner from './DisclaimerBanner.jsx'
import {
  LEGAL_DOCUMENT_TYPES,
  acceptLegalDocuments,
  findLegalDocument,
  getLegalAcceptanceStatus,
  getLegalDocumentLabel,
  normalizeLegalLanguage,
} from '../../services/legal.js'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function splitParagraphs(content) {
  return String(content ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function LegalDocumentPreview({ document }) {
  const paragraphs = splitParagraphs(document?.content)

  if (!document) {
    return <div className="muted">Document unavailable.</div>
  }

  return (
    <div className="legal-document-preview">
      <div>
        <div className="legal-modal-title">{document.title}</div>
        <div className="legal-modal-updated">
          Last updated: {formatDate(document.updatedAt)} · Version {document.version}
        </div>
      </div>
      <div className="legal-document-preview-body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}

export default function RequiredLegalAcceptanceModal({ children }) {
  const { i18n } = useTranslation()
  const language = normalizeLegalLanguage(i18n.language)
  const [status, setStatus] = useState(null)
  const [selectedType, setSelectedType] = useState('terms')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    getLegalAcceptanceStatus(language)
      .then((response) => {
        if (!alive) return
        setStatus(response)
        setAccepted(false)
      })
      .catch((caught) => {
        if (!alive) return
        setError(String(caught?.message ?? 'Could not load legal documents.').replace(/^API \d+:\s*/u, ''))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [language])

  const selectedDocument = useMemo(
    () => findLegalDocument(status?.documents, selectedType),
    [selectedType, status?.documents],
  )

  async function onAccept() {
    if (!accepted || !status?.activeVersions) return

    setSaving(true)
    setError('')

    try {
      await acceptLegalDocuments({
        activeVersions: status.activeVersions,
        language,
      })
      const next = await getLegalAcceptanceStatus(language)
      setStatus(next)
      setAccepted(false)
    } catch (caught) {
      setError(String(caught?.message ?? 'Could not save acceptance.').replace(/^API \d+:\s*/u, ''))
    } finally {
      setSaving(false)
    }
  }

  if (!loading && status?.requiresAcceptance === false) {
    return children
  }

  return (
    <>
      <div className="legal-gate-backdrop">
        <div className="legal-gate-modal" role="dialog" aria-modal="true" aria-labelledby="legal-required-title">
          <div className="legal-modal-head">
            <div>
              <div id="legal-required-title" className="legal-modal-title">
                Legal documents updated
              </div>
              <div className="legal-modal-updated">
                Our Terms, Privacy Policy, or Disclaimer have been updated. Please review and accept to continue.
              </div>
            </div>
          </div>

          <div className="legal-modal-body">
            <DisclaimerBanner compact />

            {loading ? (
              <div className="muted">Loading legal documents...</div>
            ) : null}

            {error ? (
              <div className="card" style={{ borderColor: 'rgba(255, 77, 77, 0.45)' }}>
                <div className="card-inner" style={{ color: '#ffc8c8' }}>
                  {error}
                </div>
              </div>
            ) : null}

            {!loading && status ? (
              <>
                <div className="legal-doc-tabs">
                  {LEGAL_DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`btn ${selectedType === type ? 'btn-primary' : 'btn-soft'}`}
                      onClick={() => setSelectedType(type)}
                    >
                      {getLegalDocumentLabel(type)}
                    </button>
                  ))}
                </div>

                <LegalDocumentPreview document={selectedDocument} />

                <div className="legal-consents">
                  <div className="legal-consent-row">
                    <input
                      id="required-legal-acceptance"
                      type="checkbox"
                      checked={accepted}
                      onChange={(event) => setAccepted(event.target.checked)}
                    />
                    <div className="legal-consent-copy">
                      <label htmlFor="required-legal-acceptance">
                        I agree to the Terms of Service, Privacy Policy, and Disclaimer.
                      </label>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="legal-modal-foot">
            <button
              className="btn btn-primary"
              type="button"
              disabled={!accepted || saving || loading || Boolean(error)}
              onClick={onAccept}
            >
              {saving ? 'Saving...' : 'Accept and continue'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
