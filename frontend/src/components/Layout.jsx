import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, useNotificationStore } from '../store/index'
import api from '../api'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',   icon: '📊' },
  { to: '/arbitrage',    label: 'Arbitrage',    icon: '⚡' },
  { to: '/value-bets',   label: 'Value Bets',   icon: '💎' },
  { to: '/scanner',      label: 'Scanner',      icon: '🔍' },
  { to: '/bet-tracker',  label: 'Bet Tracker',  icon: '📒' },
  { to: '/stats',        label: 'Stats',        icon: '📈' },
  { to: '/history',      label: 'History',      icon: '📋' },
  { to: '/calculator',   label: 'Calculator',   icon: '🧮' },
  { to: '/settings',     label: 'Settings',     icon: '⚙️' },
]

const TYPE_COLOR = { arb: 'text-green-400', value: 'text-blue-400' }

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { notifications, unreadCount, markAllRead, clearAll, checkNew } = useNotificationStore()
  const navigate = useNavigate()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close bell dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Background poller — checks for new arbs/value bets every 30s
  useEffect(() => {
    const poll = async () => {
      try {
        const [arbRes, vbRes] = await Promise.all([
          api.get('/opportunities?page_size=10'),
          api.get('/value-bets?page_size=10'),
        ])
        checkNew(arbRes.data.items ?? [], vbRes.data.items ?? [])
      } catch { /* silent */ }
    }
    poll()
    const t = setInterval(poll, 30_000)
    return () => clearInterval(t)
  }, [checkNew])

  const handleBellClick = () => {
    setBellOpen(o => !o)
    if (!bellOpen) markAllRead()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xl font-bold text-green-400">⚔ SharpEdge</span>

          {/* Notification Bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={handleBellClick}
              className="relative text-gray-400 hover:text-white transition-colors p-1">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {bellOpen && (
              <div className="absolute left-0 top-9 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <span className="text-sm font-semibold">Notifications</span>
                  {notifications.length > 0 && (
                    <button onClick={clearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear all</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-600 text-sm">No notifications yet</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-800">
                    {notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold uppercase ${TYPE_COLOR[n.type] ?? 'text-gray-400'}`}>
                            {n.type === 'arb' ? '⚡ Arb' : '💎 Value'}
                          </span>
                          <span className="text-xs text-gray-600 ml-auto">
                            {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-500/10 text-green-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors">
            Sign out →
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  )
}
