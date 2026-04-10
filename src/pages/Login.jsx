import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  function onSubmit(e) {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px' }}>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Login</div>
            <div className="muted">
              Acesso demonstrativo (sem backend). Depois pluga autenticação.
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" className="input" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input id="password" className="input" type="password" required />
            </div>

            <button className="btn btn-primary" type="submit">
              Entrar
            </button>
            <Link className="btn" to="/">
              Voltar para a Landing
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
