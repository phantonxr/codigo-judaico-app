export default function MetricCard({ label, value, hint }) {
  return (
    <div className="card">
      <div className="card-inner kpi">
        <span className="muted">{label}</span>
        <strong>{value}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  )
}
