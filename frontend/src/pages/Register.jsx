import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store'

const QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood friend?",
  "What street did you grow up on?",
  "What was the make of your first car?",
]

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    security_question: QUESTIONS[0], security_answer: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Registration failed')
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
          <h2 className="text-lg font-semibold mb-6">Create account</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Security question */}
            <div className="pt-1 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-3 mt-2">🔐 Secret recovery question — used if you forget your password</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Secret question</label>
                  <select value={form.security_question}
                    onChange={e => setForm({ ...form, security_question: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors">
                    {QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Your answer</label>
                  <input type="text" value={form.security_answer}
                    onChange={e => setForm({ ...form, security_answer: e.target.value })}
                    placeholder="Keep it memorable"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    required />
                </div>
              </div>
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
        </div>
      </div>
    </div>
  )
}
