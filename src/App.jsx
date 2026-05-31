import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/auth/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TradingRoom from './pages/TradingRoom'
import AdminPage from './pages/AdminPage'
import WalletPage from './pages/WalletPage'
import ProfilePage from './pages/ProfilePage'
import ReferralPage from './pages/ReferralPage'
import TournamentLobby from './pages/TournamentLobby'
import LeaderboardPage from './pages/LeaderboardPage'
import TournamentsPage from './pages/TournamentsPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            {/* Guest only — redirect to dashboard if logged in */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
            <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

            {/* Protected — requires login */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/tournaments" element={<ProtectedRoute><TournamentsPage /></ProtectedRoute>} />
            <Route path="/trade/:id" element={<ProtectedRoute><TradingRoom /></ProtectedRoute>} />
            <Route path="/lobby/:id" element={<ProtectedRoute><TournamentLobby /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />

            {/* Admin only — requires admin role */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Routes>
        </Router>
      </NotificationProvider>
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default App
