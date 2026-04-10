export default function OfferCard({ title, description, price, ctaLabel, ctaHref }) {
  return (
    <article className="card">
      <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div className="muted">{description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ color: 'var(--gold-2)', fontWeight: 800, fontSize: 18 }}>
            {price}
          </div>
        </div>
        <a className="btn btn-primary" href={ctaHref} target="_blank" rel="noreferrer">
          {ctaLabel}
        </a>
      </div>
    </article>
  )
}
