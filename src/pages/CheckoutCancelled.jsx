import { Link } from 'react-router-dom'

export default function CheckoutCancelled() {
  return (
    <div className="container" style={{ padding: '48px 0 72px' }}>
      <div className="card" style={{ maxWidth: 680, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <span className="badge" style={{ width: 'fit-content' }}>Checkout cancelado</span>
          <h1 style={{ margin: 0, fontSize: 30 }}>Seu acesso ainda nao foi liberado</h1>
          <div className="muted">
            O pagamento no Stripe nao foi concluido. Quando quiser, volte e finalize o checkout com o plano escolhido.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/checkout">
              Tentar novamente
            </Link>
            <Link className="btn" to="/">
              Voltar para a landing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
