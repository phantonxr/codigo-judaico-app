import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { readCurrentUser, saveCurrentUser } from '../hooks/useCurrentUser.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => readCurrentUser().email || '')

  async function onSubmit(e) {
    e.preventDefault()

    const existing = readCurrentUser()
    const nextEmail = String(email ?? '').trim() || existing.email || 'auditoria@codigojudaico.com'
    const nextName = existing.name && existing.name !== 'Aluno' ? existing.name : 'Anderson'
    const nextPlan = existing.plan || 'Premium Mensal'
    await saveCurrentUser({ name: nextName, email: nextEmail, plan: nextPlan })

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
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
