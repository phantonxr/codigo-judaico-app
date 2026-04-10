export default function SectionCard({ title, description, children }) {
  return (
    <section className="card">
      <div className="card-inner">
        <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          {title ? (
            <div style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
              {title}
            </div>
          ) : null}
          {description ? <div className="muted">{description}</div> : null}
        </div>
        {children}
      </div>
    </section>
  )
}
