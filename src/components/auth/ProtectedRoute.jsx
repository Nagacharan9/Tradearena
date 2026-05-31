import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Redirects to login if not authenticated
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

// Redirects to dashboard if not admin
export function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-display font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-white/40 mb-6">You don't have admin privileges to access this page.</p>
          <a href="/dashboard" className="btn-primary inline-block">← Back to Dashboard</a>
        </div>
      </div>
    )
  }

  return children
}

// Redirects to dashboard if already logged in (for login/register pages)
export function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}
