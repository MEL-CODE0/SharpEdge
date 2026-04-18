import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [step, setStep] = useState('register') // 'register' | 'verify'
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  // Step 1 — create account, trigger OTP email
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setPendingEmail(data.email)
      setStep('verify')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify OTP, get token
  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-email', { email: pendingEmail, code: otp })
      setAuth(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400">⚔ SharpEdge</h1>
          <p className="text-gray-500 mt-2 text-sm">Sports betting intelligence</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl">
          {step === 'register' ? (
            <>
              <h2 className="text-lg font-semibold mb-6">Create account</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Username</label>
                  <input type="text" value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required minLength={6} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2">
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-green-400 hover:text-green-300">Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📧</div>
                <h2 className="text-lg font-semibold">Check your email</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We sent a 6-digit code to<br />
                  <span className="text-white font-medium">{pendingEmail}</span>
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Verification code</label>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-center tracking-[0.5em] text-xl font-mono focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Verifying…' : 'Verify & continue'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                Wrong email?{' '}
                <button onClick={() => { setStep('register'); setError('') }}
                  className="text-green-400 hover:text-green-300">
                  Go back
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
