import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionCard from '../components/SectionCard.jsx'

const offerCheckoutPaths = ['/checkout', '/checkout', '/checkout?plan=anual']

export default function Mais() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const offers = t('more.offers', { returnObjects: true })

  function openOffer(path) {
    navigate(path)
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title={t('more.title')}
        description={t('more.description')}
      >
        <div className="grid grid-3">
          {Array.isArray(offers) && offers.map((offer, idx) => (
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
                  onClick={() => openOffer(offerCheckoutPaths[idx] || '/checkout')}
                >
                  {t('common.buy')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
