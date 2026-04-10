import { NavLink, Link } from 'react-router-dom'
import { userProfile } from '../mock/userProfile.js'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Rabino Mentor IA', to: '/mentor' },
  { label: 'Desafios', to: '/desafios' },
  { label: 'Biblioteca', to: '/biblioteca' },
  { label: 'Mais', to: '/mais' },
  { label: 'Assinatura', to: '/assinatura' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar-inner">
        <Link to="/" className="brand" aria-label="Ir para a Landing Page">
          <div className="brand-mark" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2l2.2 6.8H21l-5.6 4.1 2.1 6.9L12 16.9 6.5 19.8l2.1-6.9L3 8.8h6.8L12 2z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brand-text">
            <strong>Código Judaico</strong>
            <span>da Prosperidade</span>
          </div>
        </Link>
        <nav className="nav" aria-label="Navegação">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" aria-label="Perfil do usuário">
          <div className="mini-profile">
            <div className="avatar" aria-hidden="true">
              {userProfile.initials}
            </div>
            <div className="mini-profile-text">
              <div className="mini-name">{userProfile.name}</div>
              <div className="mini-meta">Plano: {userProfile.planName}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
