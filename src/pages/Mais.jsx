import SectionCard from '../components/SectionCard.jsx'

const extraOffers = [
  {
    title: 'Patrimônio Familiar',
    image: 'placeholder',
    description:
      'Uma trilha premium para construir proteção, reserva e decisões em família com clareza.',
    checkoutUrl: 'https://pay.kirvano.com/99cdcf61-a199-40d6-ab84-261f708284c2',
  },
  {
    title: 'Mentalidade de Abundância',
    image: 'placeholder',
    description:
      'Reestrutura crenças, reduz culpa e fortalece propósito — sem cair em avareza ou excesso.',
    checkoutUrl: 'https://pay.kirvano.com/99cdcf61-a199-40d6-ab84-261f708284c2',
  },
  {
    title: 'Comunidade Premium',
    image: 'placeholder',
    description:
      'Encontros exclusivos, estudos guiados, networking e desafios em grupo com acompanhamento.',
    checkoutUrl: 'https://pay.kirvano.com/99cdcf61-a199-40d6-ab84-261f708284c2',
  },
]

export default function Mais() {
  function openOffer(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title="Mais"
        description="Upsells premium e espaço para futuras integrações e perfil."
      >
        <div className="grid grid-3">
          {extraOffers.map((o) => (
            <div key={o.title} className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                <div className="offer-image" aria-hidden="true">
                  <div className="offer-image-inner" />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{o.title}</div>
                  <div className="muted">{o.description}</div>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => openOffer(o.checkoutUrl)}
                >
                  Comprar
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
