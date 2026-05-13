import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronDown } from 'lucide-react'

export default function DisclaimerBanner({ compact = false }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const financialStatements = t('legal.disclaimer_banner.statements', { returnObjects: true })

  return (
    <aside className={`disclaimer-banner${compact ? ' disclaimer-banner--compact' : ''}`}>
      <div className="disclaimer-banner-main">
        <div className="disclaimer-banner-icon" aria-hidden="true">
          <AlertTriangle size={18} />
        </div>
        <div className="disclaimer-banner-copy">
          <strong>{t('legal.disclaimer_banner.warning')}</strong>
          <span>{t('legal.disclaimer_banner.summary_short')}</span>
        </div>
        <button
          className="btn btn-soft disclaimer-banner-toggle"
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {t('legal.disclaimer_banner.details')}
          <ChevronDown
            size={16}
            className={expanded ? 'disclaimer-banner-chevron open' : 'disclaimer-banner-chevron'}
          />
        </button>
      </div>

      {expanded ? (
        <div className="disclaimer-banner-details">
          <div className="muted">{t('legal.disclaimer_banner.summary_full')}</div>
          <ul>
            {financialStatements.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
