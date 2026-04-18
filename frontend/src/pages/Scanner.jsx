import { useEffect, useState } from 'react'
import api from '../api'

export default function Scanner() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const loadStatus = async () => {
    try {
      const { data } = await api.get('/scanner/status')
      setStatus(data)
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
  }, [])

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

  const statusColor =
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
        <button
          onClick={trigger}
          disabled={triggering}
          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {triggering ? 'Triggering…' : '▶ Run Now'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Status banner */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
              <span className="font-semibold capitalize">{status?.status ?? 'idle'}</span>
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

          {/* Error */}
          {status?.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
              <p className="font-semibold mb-1">Last error</p>
              <p className="font-mono text-xs">{status.error}</p>
            </div>
          )}

          {/* Data source info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Data Source</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium">The Odds API v4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Region</span>
                <span className="font-medium">EU (betway, onexbet, pinnacle, marathonbet…)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Market</span>
                <span className="font-medium">Head-to-head (H2H)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Poll Interval</span>
                <span className="font-medium">60 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requests Used</span>
                <span className="font-medium">{status?.requests_used ?? 0} this cycle</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
