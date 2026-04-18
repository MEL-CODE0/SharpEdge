import { useEffect, useState, useRef } from 'react'
import api from '../api'

export default function Scanner() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const prevArbs = useRef(null)
  const prevVbs = useRef(null)

  const loadStatus = async () => {
    try {
      const { data } = await api.get('/scanner/status')
      setStatus(data)

      // Browser notifications for new opportunities
      if (notifEnabled && Notification.permission === 'granted') {
        if (prevArbs.current !== null && data.arb_found > prevArbs.current) {
          new Notification('SharpEdge ⚡', {
            body: `${data.arb_found} arbitrage opportunity${data.arb_found !== 1 ? 'ies' : 'y'} found!`,
            icon: '/favicon.ico',
          })
        }
        if (prevVbs.current !== null && data.value_found > prevVbs.current) {
          new Notification('SharpEdge 💎', {
            body: `${data.value_found} value bet${data.value_found !== 1 ? 's' : ''} found!`,
            icon: '/favicon.ico',
          })
        }
      }
      prevArbs.current = data.arb_found
      prevVbs.current = data.value_found
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const t = setInterval(loadStatus, 15_000)
    return () => clearInterval(t)
  }, [notifEnabled])

  const handleToggle = async () => {
    setToggling(true)
    try {
      if (status?.paused) {
        await api.post('/scanner/resume')
      } else {
        await api.post('/scanner/pause')
      }
      await loadStatus()
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(false)
    }
  }

  const trigger = async () => {
    setTriggering(true)
    try {
      await api.post('/scanner/trigger')
      setTimeout(loadStatus, 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setTriggering(false)
    }
  }

  const toggleNotifications = async () => {
    if (!notifEnabled) {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') setNotifEnabled(true)
    } else {
      setNotifEnabled(false)
    }
  }

  const isPaused = status?.paused
  const statusColor =
    isPaused ? 'bg-yellow-500' :
    status?.status === 'running' ? 'bg-green-500' :
    status?.status === 'error' ? 'bg-red-500' :
    status?.status === 'starting' ? 'bg-yellow-500' :
    'bg-gray-500'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scanner</h1>
          <p className="text-gray-500 text-sm mt-1">The Odds API polling engine</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notifications toggle */}
          <button
            onClick={toggleNotifications}
            className={`text-sm px-4 py-2.5 rounded-lg font-medium transition-colors border ${
              notifEnabled
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            🔔 {notifEnabled ? 'Notifications on' : 'Notifications off'}
          </button>

          {/* Scanner on/off toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`text-sm px-4 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
              isPaused
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {toggling ? '…' : isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>

          {/* Manual trigger */}
          <button
            onClick={trigger}
            disabled={triggering || isPaused}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {triggering ? 'Running…' : '▶ Run Now'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className={`w-3 h-3 rounded-full ${statusColor} ${!isPaused ? 'animate-pulse' : ''}`} />
              <span className="font-semibold capitalize">{isPaused ? 'Paused' : (status?.status ?? 'idle')}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Last Run', value: status?.ran_at ? new Date(status.ran_at).toLocaleString() : 'Never' },
                { label: 'Sports Scanned', value: status?.sports_scanned ?? 0 },
                { label: 'Events Scanned', value: status?.events_scanned ?? 0 },
                { label: 'Arb Found', value: status?.arb_found ?? 0, color: 'text-green-400' },
                { label: 'Value Bets Found', value: status?.value_found ?? 0, color: 'text-blue-400' },
                { label: 'API Quota Remaining', value: status?.requests_remaining ?? '—', color: 'text-yellow-400' },
              ].map((row) => (
                <div key={row.label} className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-gray-500 text-xs mb-1">{row.label}</p>
                  <p className={`font-semibold ${row.color ?? 'text-white'}`}>{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {status?.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
              <p className="font-semibold mb-1">Last error</p>
              <p className="font-mono text-xs">{status.error}</p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Data Source</h2>
            <div className="space-y-3 text-sm">
              {[
                ['Provider', 'The Odds API v4'],
                ['Region', 'EU'],
                ['Bookmakers', 'Betway ⭐, 1xBet ⭐, Pinnacle, Marathonbet, Betfair'],
                ['Market', 'Head-to-head (H2H)'],
                ['Poll Interval', '60 seconds'],
                ['Requests Used', `${status?.requests_used ?? 0} this cycle`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
