import { Link } from 'react-router-dom'
import { useState } from 'react'
import { requestPasswordReset } from '../services/sessionSync.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await requestPasswordReset(email)
      setSuccess(true)
    } catch {
      setError('Nao foi possivel enviar o e-mail agora. Tente novamente em instantes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Recuperar senha</div>
            <div className="muted">
              Informe seu e-mail para receber um link de redefinicao de senha.
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="muted" style={{ color: '#f3b0b0' }}>
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="muted" style={{ color: '#c7f3b0' }}>
                Se o e-mail existir na base, enviamos o link para redefinir a senha.
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <Link className="btn" to="/login">
              Voltar para o login
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
