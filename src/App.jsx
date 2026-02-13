import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Domains from './pages/Domains'
import Lists from './pages/Lists'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Settings from './pages/Settings'
import Warmup from './pages/Warmup'
import Reputation from './pages/Reputation'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/domains" element={<Domains />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/warmup" element={<Warmup />} />
              <Route path="/reputation" element={<Reputation />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
