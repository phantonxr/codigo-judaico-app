import { useNavigate } from 'react-router-dom'
import SectionCard from '../components/SectionCard.jsx'

const extraOffers = [
  {
    title: 'Patrimonio Familiar',
    image: 'placeholder',
    description:
      'Uma trilha premium para construir protecao, reserva e decisoes em familia com clareza.',
    checkoutPath: '/checkout',
  },
  {
    title: 'Mentalidade de Abundancia',
    image: 'placeholder',
    description:
      'Reestrutura crencas, reduz culpa e fortalece proposito sem cair em excesso.',
    checkoutPath: '/checkout',
  },
  {
    title: 'Comunidade Premium',
    image: 'placeholder',
    description:
      'Encontros exclusivos, estudos guiados, networking e desafios em grupo com acompanhamento.',
    checkoutPath: '/checkout?plan=anual',
  },
]

export default function Mais() {
  const navigate = useNavigate()

  function openOffer(path) {
    navigate(path)
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title="Mais"
        description="Upsells premium e espaco para futuras integracoes e perfil."
      >
        <div className="grid grid-3">
          {extraOffers.map((offer) => (
            <div key={offer.title} className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                <div className="offer-image" aria-hidden="true">
                  <div className="offer-image-inner" />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{offer.title}</div>
                  <div className="muted">{offer.description}</div>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => openOffer(offer.checkoutPath)}
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
