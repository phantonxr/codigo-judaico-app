export default function ChallengeCard({
  title,
  description,
  level,
  reward,
  status,
  days,
  progressPct,
  streak,
  onOpen,
}) {
  return (
    <article className="card">
      <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
            <div className="muted">{description}</div>
          </div>
          <span className="badge">{progressPct}%</span>
        </div>

        <div className="progress" aria-label="Progresso do desafio">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span className="badge">{days} dias</span>
          <span className="badge">Streak: {streak} dias</span>
          <span className="badge">Nível: {level}</span>
          <span className="badge">Status: {status}</span>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div className="muted">{reward}</div>
          <button className="btn btn-primary" type="button" onClick={onOpen}>
            Abrir desafio
          </button>
        </div>
      </div>
    </article>
  )
}
