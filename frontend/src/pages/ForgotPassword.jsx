import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ForgotPassword() {
  const [step, setStep] = useState('email')   // 'email' | 'answer' | 'done'
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [form, setForm] = useState({ answer: '', new_password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1 — look up the security question for this email
  const handleLookup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password/question', { email })
      setQuestion(data.question)
      setStep('answer')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'No account found with that email')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify answer + set new password
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
        answer: form.answer,
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
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll ask you your secret question.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Looking up…' : 'Continue'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="text-green-400 hover:text-green-300">← Back to sign in</Link>
              </p>
            </>
          )}

          {step === 'answer' && (
            <>
              <h2 className="text-lg font-semibold mb-2">Secret question</h2>
              <p className="text-gray-500 text-sm mb-5">Answer your secret question to reset your password.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
              )}

              {/* Show the question */}
              <div className="bg-gray-800 rounded-lg px-4 py-3 mb-5 text-sm text-gray-300">
                🔐 {question}
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Your answer</label>
                  <input type="text" value={form.answer}
                    onChange={e => setForm({ ...form, answer: e.target.value })}
                    placeholder="Enter your answer"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
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
                Wrong email?{' '}
                <button onClick={() => { setStep('email'); setError('') }}
                  className="text-green-400 hover:text-green-300">Go back</button>
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
