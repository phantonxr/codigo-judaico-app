export default function PlanCard({ name, price, period, features = [], highlighted }) {
  return (
    <article
      className="card"
      style={
        highlighted
          ? {
              borderColor: 'rgba(215, 178, 74, 0.45)',
              background:
                'linear-gradient(180deg, rgba(215, 178, 74, 0.10), rgba(255,255,255,0.03))',
            }
          : undefined
      }
    >
      <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontWeight: 900 }}>{name}</div>
          {highlighted ? <span className="badge">Recomendado</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <div style={{ color: 'var(--gold-2)', fontWeight: 900, fontSize: 22 }}>
            {price}
          </div>
          <div className="muted">{period}</div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.82)' }}>
          {features.map((f) => (
            <li key={f} style={{ marginBottom: 6 }}>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
