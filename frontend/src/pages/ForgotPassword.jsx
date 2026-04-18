import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

export default function ForgotPassword() {
  const [step, setStep] = useState('email')   // 'email' | 'reset' | 'done'
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ code: '', new_password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Step 1 — send OTP
  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify OTP + set new password
  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        code: form.code,
        new_password: form.new_password,
      })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Reset failed')
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
          {step === 'email' && (
            <>
              <h2 className="text-lg font-semibold mb-2">Forgot password</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset code.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="text-green-400 hover:text-green-300">← Back to sign in</Link>
              </p>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔑</div>
                <h2 className="text-lg font-semibold">Enter reset code</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Code sent to <span className="text-white font-medium">{email}</span>
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">6-digit code</label>
                  <input type="text" value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-center tracking-[0.5em] text-xl font-mono focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">New password</label>
                  <input type="password" value={form.new_password}
                    onChange={e => setForm({ ...form, new_password: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required minLength={6} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Confirm password</label>
                  <input type="password" value={form.confirm}
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required minLength={6} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                Didn't get the code?{' '}
                <button onClick={() => { setStep('email'); setError('') }}
                  className="text-green-400 hover:text-green-300">
                  Resend
                </button>
              </p>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-lg font-semibold mb-2">Password reset!</h2>
              <p className="text-gray-500 text-sm mb-6">Your password has been updated. You can now sign in.</p>
              <Link to="/login"
                className="w-full inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm text-center">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
