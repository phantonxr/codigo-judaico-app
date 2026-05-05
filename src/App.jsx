import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import RequiredLegalAcceptanceModal from './components/legal/RequiredLegalAcceptanceModal.jsx'

import LandingPage from './pages/LandingPage.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import CheckoutSuccess from './pages/CheckoutSuccess.jsx'
import CheckoutCancelled from './pages/CheckoutCancelled.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RabinoMentorIA from './pages/RabinoMentorIA.jsx'
import Desafios from './pages/Desafios.jsx'
import Biblioteca from './pages/Biblioteca.jsx'
import Mais from './pages/Mais.jsx'
import Assinatura from './pages/Assinatura.jsx'
import AdminAssinantes from './pages/AdminAssinantes.jsx'
import AdminLegal from './pages/AdminLegal.jsx'
import AvaliacaoFinanceira from './pages/AvaliacaoFinanceira.jsx'
import Calendario from './pages/Calendario.jsx'
import RelatorioFinal from './pages/RelatorioFinal.jsx'
import Livros from './pages/Livros.jsx'
import { hasAuthToken } from './services/authStorage.js'
import useCurrentUser from './hooks/useCurrentUser.js'

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

function SubscriptionRequiredNotice() {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const nextChargeDate = currentUser?.nextChargeDate || t('common.now', 'agora')

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <div
        className="card"
        style={{
          maxWidth: 780,
          marginInline: 'auto',
          borderColor: 'rgba(215, 178, 74, 0.55)',
        }}
      >
        <div className="card-inner" style={{ display: 'grid', gap: 16 }}>
          <span className="badge" style={{ width: 'fit-content' }}>{t('subscription_notice.badge')}</span>
          <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>
            {t('subscription_notice.title')}
          </h2>
          <div className="muted" style={{ fontSize: 15, lineHeight: 1.7 }}>
            {t('subscription_notice.description')}
          </div>
          <div className="grid grid-2">
            <div className="card" style={{ boxShadow: 'none' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                <div className="muted">{t('subscription_notice.current_plan')}</div>
                <div style={{ fontWeight: 900 }}>{currentUser?.plan || t('subscription_notice.plan_paused')}</div>
              </div>
            </div>
            <div className="card" style={{ boxShadow: 'none' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 4 }}>
                <div className="muted">{t('subscription_notice.valid_until')}</div>
                <div style={{ fontWeight: 900 }}>{nextChargeDate}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/assinatura">
              {t('subscription_notice.renew_btn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function RequireSubscriptionAccess() {
  const currentUser = useCurrentUser()
  const [subscriptionRequiredByEvent, setSubscriptionRequiredByEvent] = useState(false)
  const subscriptionRequired = currentUser?.hasActiveAccess === false || subscriptionRequiredByEvent

  useEffect(() => {
    const onSubscriptionRequired = () => setSubscriptionRequiredByEvent(true)
    window.addEventListener('subscription_required', onSubscriptionRequired)
    return () => {
      window.removeEventListener('subscription_required', onSubscriptionRequired)
    }
  }, [])

  if (subscriptionRequired) {
    return <SubscriptionRequiredNotice />
  }

  return <Outlet />
}

function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname
  const [mobileNavState, setMobileNavState] = useState({ open: false, pathname })
  const mobileNavOpen = mobileNavState.open && mobileNavState.pathname === pathname

  const titleMap = {
    '/dashboard': t('page_titles./dashboard'),
    '/mentor': t('page_titles./mentor'),
    '/desafios': t('page_titles./desafios'),
    '/biblioteca': t('page_titles./biblioteca'),
    '/mais': t('page_titles./mais'),
    '/assinatura': t('page_titles./assinatura'),
    '/admin/assinantes': t('page_titles./admin/assinantes'),
    '/admin/legal': t('page_titles./admin/legal', 'Legal settings'),
    '/avaliacao': t('page_titles./avaliacao'),
    '/calendario': t('page_titles./calendario'),
    '/relatorio-final': t('page_titles./relatorio-final'),
    '/livros': t('page_titles./livros'),
  }
  const title = titleMap[pathname] ?? t('page_titles.default')

  return (
    <div className="app-shell">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavState({ open: false, pathname })} />
      <div className="app-main">
        <Topbar
          title={title}
          user={null}
          onMenuToggle={() => setMobileNavState({ open: !mobileNavOpen, pathname })}
        />
        <main className="app-content" role="main">
          <RequiredLegalAcceptanceModal>
            <div key={location.pathname} className="page-transition">
              <Outlet />
            </div>
          </RequiredLegalAcceptanceModal>
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
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
      <Route path="/checkout/cancelado" element={<CheckoutCancelled />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/assinatura" element={<Assinatura />} />
          <Route path="/admin/assinantes" element={<AdminAssinantes />} />
          <Route path="/admin/legal" element={<AdminLegal />} />
          <Route path="/livros" element={<Livros />} />
          <Route element={<RequireSubscriptionAccess />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mentor" element={<RabinoMentorIA />} />
            <Route path="/desafios" element={<Desafios />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/mais" element={<Mais />} />
            <Route path="/avaliacao" element={<AvaliacaoFinanceira />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/relatorio-final" element={<RelatorioFinal />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
