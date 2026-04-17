import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'

import LandingPage from './pages/LandingPage.jsx'
import Login from './pages/Login.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import CheckoutSuccess from './pages/CheckoutSuccess.jsx'
import CheckoutCancelled from './pages/CheckoutCancelled.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RabinoMentorIA from './pages/RabinoMentorIA.jsx'
import Desafios from './pages/Desafios.jsx'
import Biblioteca from './pages/Biblioteca.jsx'
import Mais from './pages/Mais.jsx'
import Assinatura from './pages/Assinatura.jsx'
import AvaliacaoFinanceira from './pages/AvaliacaoFinanceira.jsx'
import Calendario from './pages/Calendario.jsx'
import { hasAuthToken } from './services/authStorage.js'

function RequireAuth() {
  const location = useLocation()
  const [authenticated, setAuthenticated] = useState(() => hasAuthToken())

  useEffect(() => {
    const sync = () => setAuthenticated(hasAuthToken())
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('auth_user_updated', sync)
    window.addEventListener('auth_session_invalid', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('auth_user_updated', sync)
      window.removeEventListener('auth_session_invalid', sync)
    }
  }, [])

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function AppLayout() {
  const location = useLocation()
  const pathname = location.pathname

  const titleMap = {
    '/dashboard': 'Dashboard',
    '/mentor': 'Rabino Mentor IA',
    '/desafios': 'Desafios',
    '/biblioteca': 'Biblioteca',
    '/mais': 'Mais',
    '/assinatura': 'Assinatura',
    '/avaliacao': 'Avaliação Financeira',
    '/calendario': 'Calendário',
  }
  const title = titleMap[pathname] ?? 'Código Judaico da Prosperidade'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} user={null} />
        <main className="app-content" role="main">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
      <Route path="/checkout/cancelado" element={<CheckoutCancelled />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mentor" element={<RabinoMentorIA />} />
          <Route path="/desafios" element={<Desafios />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/mais" element={<Mais />} />
          <Route path="/assinatura" element={<Assinatura />} />
          <Route path="/avaliacao" element={<AvaliacaoFinanceira />} />
          <Route path="/calendario" element={<Calendario />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
