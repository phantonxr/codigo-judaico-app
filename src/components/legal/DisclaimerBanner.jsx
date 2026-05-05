import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'

const FINANCIAL_WARNING = '⚠️ This is not financial advice'
const FINANCIAL_SUMMARY =
  'This application may generate financial insights, recommendations, assessments, reports, or AI outputs. These are informational only and must be independently verified.'
const FINANCIAL_STATEMENTS = [
  'This is not financial, investment, tax, legal, accounting, brokerage, fiduciary, or licensed professional advice.',
  'No profit, savings, investment performance, tax result, debt result, compliance outcome, or financial improvement is guaranteed.',
  'Users are fully responsible for their own decisions, actions, inaction, losses, tax obligations, and outcomes.',
  'Users should consult a licensed financial professional, investment advisor, tax professional, accountant, attorney, or other qualified professional before making decisions.',
  'Wast Systems develops, distributes, publishes, and receives payments for the software. Phantom Systems is responsible for business content, recommendations, AI outputs, guidance, and domain-specific logic.',
]

export default function DisclaimerBanner({ compact = false }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <aside className={`disclaimer-banner${compact ? ' disclaimer-banner--compact' : ''}`}>
      <div className="disclaimer-banner-main">
        <div className="disclaimer-banner-icon" aria-hidden="true">
          <AlertTriangle size={18} />
        </div>
        <div className="disclaimer-banner-copy">
          <strong>{FINANCIAL_WARNING}</strong>
          <span>
            Recommendations are provided by Phantom Systems. Wast Systems is not
            responsible for financial advice or financial outcomes.
          </span>
        </div>
        <button
          className="btn btn-soft disclaimer-banner-toggle"
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          Details
          <ChevronDown
            size={16}
            className={expanded ? 'disclaimer-banner-chevron open' : 'disclaimer-banner-chevron'}
          />
        </button>
      </div>

      {expanded ? (
        <div className="disclaimer-banner-details">
          <div className="muted">{FINANCIAL_SUMMARY}</div>
          <ul>
            {FINANCIAL_STATEMENTS.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
