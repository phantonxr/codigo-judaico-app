import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'

import LandingPage from './pages/LandingPage.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RabinoMentorIA from './pages/RabinoMentorIA.jsx'
import Desafios from './pages/Desafios.jsx'
import Biblioteca from './pages/Biblioteca.jsx'
import Mais from './pages/Mais.jsx'
import Assinatura from './pages/Assinatura.jsx'
import { userProfile } from './mock/userProfile.js'

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
  }
  const title = titleMap[pathname] ?? 'Código Judaico da Prosperidade'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} user={userProfile} />
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

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mentor" element={<RabinoMentorIA />} />
        <Route path="/desafios" element={<Desafios />} />
        <Route path="/biblioteca" element={<Biblioteca />} />
        <Route path="/mais" element={<Mais />} />
        <Route path="/assinatura" element={<Assinatura />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
