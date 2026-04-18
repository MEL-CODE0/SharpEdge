import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store'

export default function Settings() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [pwLoading, setPwLoading] = useState(false)

  const [delConfirm, setDelConfirm] = useState('')
  const [delLoading, setDelLoading] = useState(false)
  const [delMsg, setDelMsg] = useState(null)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    setPwLoading(true)
    try {
      await api.put('/profile/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      setPwMsg({ type: 'success', text: 'Password updated successfully' })
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.detail ?? 'Failed to update password' })
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (delConfirm !== user?.username) {
      setDelMsg({ type: 'error', text: `Type your username "${user?.username}" to confirm` })
      return
    }
    setDelLoading(true)
    try {
      await api.delete('/profile/account')
      logout()
      navigate('/login')
    } catch (err) {
      setDelMsg({ type: 'error', text: err.response?.data?.detail ?? 'Failed to delete account' })
      setDelLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Account preferences</p>
      </div>

      {/* Account info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Username</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Change Password</h2>
        {pwMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            pwMsg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {pwMsg.text}
          </div>
        )}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { label: 'Current password', key: 'current_password' },
            { label: 'New password', key: 'new_password' },
            { label: 'Confirm new password', key: 'confirm' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                required
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Delete account */}
      <div className="bg-gray-900 border border-red-900/30 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account. Type <span className="text-white font-mono">{user?.username}</span> to confirm.
        </p>
        {delMsg && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400">
            {delMsg.text}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder={`Type "${user?.username}"`}
            value={delConfirm}
            onChange={e => setDelConfirm(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={delLoading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {delLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
