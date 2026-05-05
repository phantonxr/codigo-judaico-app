import { useEffect, useId } from 'react'
import { X } from 'lucide-react'

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

export default function LegalDocumentModal({ document: legalDocument, open, onClose }) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  if (!open) return null
  if (!legalDocument) return null

  const paragraphs = splitParagraphs(legalDocument.content)

  return (
    <div
      className="legal-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="legal-modal-head">
          <div>
            <div id={titleId} className="legal-modal-title">
              {legalDocument.title}
            </div>
            <div className="legal-modal-updated">
              Last updated: {formatDate(legalDocument.updatedAt)}
              {' · '}
              Version {legalDocument.version}
            </div>
          </div>
          <button
            className="icon-btn"
            type="button"
            aria-label="Close legal document"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="legal-modal-body">
          {paragraphs.map((paragraph) => (
            <p className="legal-document-intro" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>

        <div className="legal-modal-foot">
          <button className="btn btn-primary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
