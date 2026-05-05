import { FileText, RefreshCw, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionCard from '../components/SectionCard.jsx'
import LegalDocumentModal from '../components/legal/LegalDocumentModal.jsx'
import useCurrentUser from '../hooks/useCurrentUser.js'
import {
  LEGAL_DOCUMENT_TYPES,
  LEGAL_LANGUAGES,
  getLegalDocumentLabel,
  listAdminLegalDocuments,
  saveAdminLegalDocument,
  setAdminLegalDocumentStatus,
} from '../services/legal.js'

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function suggestNextVersion(version) {
  const parts = String(version || '1.0.0').split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length >= 3 && parts.every((part) => Number.isFinite(part))) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
  }

  return version ? `${version}-next` : '1.0.0'
}

function sortDocuments(documents) {
  return [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export default function AdminLegal() {
  const currentUser = useCurrentUser()
  const [type, setType] = useState('terms')
  const [language, setLanguage] = useState('pt-BR')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewDocument, setPreviewDocument] = useState(null)
  const [form, setForm] = useState({
    version: '1.0.0',
    title: '',
    content: '',
    isActive: true,
  })

  const selectedDocuments = useMemo(
    () => sortDocuments(documents.filter((document) => document.type === type && document.language === language)),
    [documents, language, type],
  )

  const activeDocument = selectedDocuments.find((document) => document.isActive) ?? selectedDocuments[0] ?? null

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listAdminLegalDocuments()
      setDocuments(Array.isArray(response) ? response : [])
    } catch (caught) {
      setError(String(caught?.message ?? 'Could not load legal documents.').replace(/^API \d+:\s*/u, ''))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!currentUser?.isMasterUser) return
    loadDocuments()
  }, [currentUser?.isMasterUser, loadDocuments])

  useEffect(() => {
    setForm({
      version: suggestNextVersion(activeDocument?.version),
      title: activeDocument?.title ?? getLegalDocumentLabel(type),
      content: activeDocument?.content ?? '',
      isActive: true,
    })
  }, [activeDocument?.content, activeDocument?.title, activeDocument?.version, type])

  if (!currentUser?.isMasterUser) {
    return (
      <div className="container dashboard-grid">
        <SectionCard title="Restricted access" description="Area exclusive to master user.">
          <Link className="btn btn-primary" to="/dashboard">
            Back to dashboard
          </Link>
        </SectionCard>
      </div>
    )
  }

  async function onSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await saveAdminLegalDocument({
        type,
        language,
        ...form,
      })
      setSuccess('New legal document version saved.')
      await loadDocuments()
    } catch (caught) {
      setError(String(caught?.message ?? 'Could not save legal document.').replace(/^API \d+:\s*/u, ''))
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(document, isActive) {
    setError('')
    setSuccess('')

    try {
      await setAdminLegalDocumentStatus(document.id, isActive)
      setSuccess(isActive ? 'Version activated.' : 'Version deactivated.')
      await loadDocuments()
    } catch (caught) {
      setError(String(caught?.message ?? 'Could not update status.').replace(/^API \d+:\s*/u, ''))
    }
  }

  function applyDraft(document) {
    setForm({
      version: suggestNextVersion(document.version),
      title: document.title,
      content: document.content,
      isActive: true,
    })
  }

  return (
    <div className="container dashboard-grid">
      <LegalDocumentModal
        document={previewDocument}
        open={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
      />

      <SectionCard
        title="Legal settings"
        description="Manage active Terms, Privacy Policy, and Disclaimer versions for each supported language."
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="legal-admin-toolbar">
            <div className="field">
              <label htmlFor="legal-type">Document</label>
              <select
                id="legal-type"
                className="input"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {LEGAL_DOCUMENT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {getLegalDocumentLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="legal-language">Language</label>
              <select
                id="legal-language"
                className="input"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LEGAL_LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-soft" type="button" onClick={loadDocuments} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          </div>

          {activeDocument ? (
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <FileText size={16} style={{ color: 'var(--gold-2)' }} />
                  <strong>Active version: {activeDocument.version}</strong>
                  <span className="badge">Last updated {formatDateTime(activeDocument.updatedAt)}</span>
                </div>
                <div className="muted" style={{ lineHeight: 1.6 }}>
                  {activeDocument.title}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="card" style={{ borderColor: 'rgba(255, 77, 77, 0.45)' }}>
              <div className="card-inner" style={{ color: '#ffc8c8' }}>
                {error}
              </div>
            </div>
          ) : null}

          {success ? (
            <div className="card" style={{ borderColor: 'rgba(215, 178, 74, 0.45)' }}>
              <div className="card-inner" style={{ color: 'var(--gold-2)' }}>
                {success}
              </div>
            </div>
          ) : null}

          <form className="legal-admin-editor" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="legal-version">New version number</label>
              <input
                id="legal-version"
                className="input"
                value={form.version}
                onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))}
                placeholder="1.0.1"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="legal-title">Title</label>
              <input
                id="legal-title"
                className="input"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="legal-content">Content</label>
              <textarea
                id="legal-content"
                className="input legal-admin-textarea"
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                required
              />
            </div>

            <label className="legal-consent-row" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span className="legal-consent-copy">Activate this version after saving</span>
            </label>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Save size={16} aria-hidden="true" />
              {saving ? 'Saving...' : 'Save new version'}
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Last updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="muted">
                      No versions found for this document and language.
                    </td>
                  </tr>
                ) : selectedDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.version}</strong>
                    </td>
                    <td>
                      <span className="badge">
                        {document.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{document.title}</td>
                    <td>{formatDateTime(document.updatedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-soft" type="button" onClick={() => setPreviewDocument(document)}>
                          View previous version
                        </button>
                        <button className="btn btn-soft" type="button" onClick={() => applyDraft(document)}>
                          Use as draft
                        </button>
                        <button
                          className="btn btn-soft"
                          type="button"
                          onClick={() => toggleStatus(document, !document.isActive)}
                        >
                          {document.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
