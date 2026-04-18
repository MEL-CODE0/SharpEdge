import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/index'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Arbitrage from './pages/Arbitrage'
import ValueBets from './pages/ValueBets'
import Scanner from './pages/Scanner'
import BetTracker from './pages/BetTracker'
import Stats from './pages/Stats'
import History from './pages/History'
import Calculator from './pages/Calculator'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="arbitrage" element={<Arbitrage />} />
        <Route path="value-bets" element={<ValueBets />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="bet-tracker" element={<BetTracker />} />
        <Route path="stats" element={<Stats />} />
        <Route path="history" element={<History />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
