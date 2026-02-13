import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#09090b', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={28} color="#10b981" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
