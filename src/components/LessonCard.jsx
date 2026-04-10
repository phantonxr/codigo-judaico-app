export default function LessonCard({
  title,
  category,
  duration,
  summary,
  teaching,
  proverb,
  practical,
  reflection,
  completed,
  videoUrl,
  onToggleComplete,
}) {
  const posterSvg =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <radialGradient id="g" cx="18%" cy="10%" r="85%">
      <stop offset="0%" stop-color="#1a1407" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#0b0a10" stop-opacity="1"/>
      <stop offset="100%" stop-color="#07060a" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect x="64" y="64" width="1152" height="592" rx="26" fill="none" stroke="#d7b24a" stroke-opacity="0.22"/>
  <circle cx="640" cy="360" r="64" fill="#d7b24a" fill-opacity="0.10"/>
  <path d="M625 332 L625 388 L675 360 Z" fill="#f0d27a" fill-opacity="0.78"/>
  <text x="640" y="460" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="24" fill="#f0d27a" fill-opacity="0.62">Carregando vídeo…</text>
</svg>`,
    )

  return (
    <article className={`card ${completed ? 'card-complete' : ''}`}>
      <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="lesson-head">
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
              <div className="muted">{summary}</div>
            </div>
            {completed ? <span className="badge">Concluída</span> : <span className="badge">Em andamento</span>}
          </div>

          <div className="lesson-media">
            <video
              controls
              preload="metadata"
              controlsList="nodownload"
              playsInline
              className="lesson-video"
              poster={posterSvg}
              src={videoUrl}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="badge">Categoria: {category}</span>
            <span className="badge">Tempo: {duration}</span>
          </div>
        </div>

        <div className="lesson-body">
          <div className="lesson-block">
            <div className="lesson-label">Ensinamento</div>
            <div className="lesson-text">{teaching}</div>
          </div>
          <div className="lesson-block">
            <div className="lesson-label">Provérbio</div>
            <div className="lesson-text">{proverb}</div>
          </div>
          <div className="lesson-block">
            <div className="lesson-label">Aplicação prática</div>
            <div className="lesson-text">{practical}</div>
          </div>
          <div className="lesson-block">
            <div className="lesson-label">Reflexão guiada</div>
            <div className="lesson-text">{reflection}</div>
          </div>
        </div>

        <button className="btn btn-primary" type="button" onClick={onToggleComplete}>
          {completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
        </button>
      </div>
    </article>
  )
}
