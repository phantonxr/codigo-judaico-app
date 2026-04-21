import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { resetPassword } from '../services/sessionSync.js'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const token = params.get('token') ?? ''

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('Link invalido. Solicite um novo e-mail de recuperacao.')
      return
    }

    if (password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)
    try {
      await resetPassword({ token, password })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (caught) {
      const message =
        caught?.data?.detail ||
        caught?.data?.message ||
        'Nao foi possivel redefinir a senha. Solicite um novo link.'
      setError(String(message).replace(/^API \d+:\s*/u, ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Definir nova senha</div>
            <div className="muted">Escolha sua nova senha para entrar no sistema.</div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="password">Nova senha</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
                Senha atualizada com sucesso. Redirecionando para o login...
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
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
