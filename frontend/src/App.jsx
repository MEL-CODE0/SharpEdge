import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Arbitrage from './pages/Arbitrage'
import ValueBets from './pages/ValueBets'
import Scanner from './pages/Scanner'
import Settings from './pages/Settings'
import Calculator from './pages/Calculator'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
        <Route path="calculator" element={<Calculator />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
