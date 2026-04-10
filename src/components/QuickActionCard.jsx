import { Link } from 'react-router-dom'

export default function QuickActionCard({ title, description, to }) {
  return (
    <Link className="card" to={to}>
      <div className="card-inner" style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div className="muted">{description}</div>
      </div>
    </Link>
  )
}
