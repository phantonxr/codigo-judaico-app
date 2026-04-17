import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getCheckoutSessionStatus } from '../services/payments.js'

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError('Nao encontrei a sessao de checkout para confirmar o pagamento.')
      return
    }

    let active = true

    let timeoutId

    async function poll(attempt = 0) {
      try {
        const data = await getCheckoutSessionStatus(sessionId)

        if (!active) return

        setStatus(data)
        setError('')

        if (data?.accessGranted || attempt >= 9) {
          setLoading(false)
          return
        }

        timeoutId = window.setTimeout(() => {
          poll(attempt + 1)
        }, 3000)
      } catch {
        if (!active) return

        if (attempt >= 4) {
          setError('Recebemos seu retorno, mas ainda nao consegui consultar o status agora.')
          setLoading(false)
          return
        }

        timeoutId = window.setTimeout(() => {
          poll(attempt + 1)
        }, 3000)
      }
    }

    poll()

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [sessionId])

  return (
    <div className="container" style={{ padding: '48px 0 72px' }}>
      <div className="card" style={{ maxWidth: 720, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 16 }}>
          <span className="badge" style={{ width: 'fit-content' }}>Pagamento recebido</span>
          <h1 style={{ margin: 0, fontSize: 30 }}>Estamos liberando seu acesso</h1>

          {loading ? (
            <div className="muted">
              Conferindo a confirmacao do checkout e liberando o login da sua conta...
            </div>
          ) : error ? (
            <div className="muted" style={{ color: '#f3b0b0' }}>{error}</div>
          ) : (
            <>
              <div className="muted">
                {status?.accessGranted
                  ? `Seu acesso ja foi liberado para ${status?.email || 'o e-mail informado'}. Entre com a senha criada no checkout.`
                  : 'O pagamento voltou com sucesso. Se o acesso ainda nao apareceu, aguarde alguns instantes para a confirmacao final do Stripe.'}
              </div>
              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 6 }}>
                  <div><strong>Plano:</strong> {status?.planName || 'Premium'}</div>
                  <div><strong>E-mail:</strong> {status?.email || 'nao informado'}</div>
                  <div><strong>Status Stripe:</strong> {status?.paymentStatus || 'processando'}</div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/login">
              Ir para o login
            </Link>
            <Link className="btn" to="/checkout">
              Voltar ao checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
