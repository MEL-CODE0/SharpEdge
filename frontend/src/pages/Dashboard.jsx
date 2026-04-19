import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const SPORT_ICONS = {
  soccer: '⚽', basketball: '🏀', tennis: '🎾', icehockey: '🏒',
  mma: '🥊', boxing: '🥊', cricket: '🏏', americanfootball: '🏈',
  baseball: '⚾', rugbyleague: '🏉',
}

function getSportIcon(key) {
  const cat = key?.split('_')[0]
  return SPORT_ICONS[cat] ?? '🏟'
}

function StatCard({ label, value, sub, color = 'green', to }) {
  const colours = { green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400', yellow: 'text-yellow-400', red: 'text-red-400' }
  const card = (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colours[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [scanStatus, setScanStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const loadAll = async () => {
    try {
      const [arb, vb, scan] = await Promise.all([
        api.get('/opportunities?page_size=1'),
        api.get('/value-bets?page_size=1'),
        api.get('/scanner/status'),
      ])
      setStats({ arbTotal: arb.data.total, vbTotal: vb.data.total })
      setScanStatus(scan.data)
      return scan.data
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadAll()
    const t = setInterval(loadAll, 30_000)
    return () => clearInterval(t)
  }, [])

  const handleScanNow = async () => {
    if (scanning) return
    setScanning(true)
    const prevRanAt = scanStatus?.ran_at ?? null
    try {
      await api.post('/scanner/trigger')
      // Poll every 2s until ran_at changes (scan complete) or 90s timeout
      let elapsed = 0
      const poll = setInterval(async () => {
        elapsed += 2
        const fresh = await loadAll()
        if ((fresh?.ran_at && fresh.ran_at !== prevRanAt) || elapsed >= 90) {
          clearInterval(poll)
          setScanning(false)
        }
      }, 2000)
    } catch (e) {
      console.error(e)
      setScanning(false)
    }
  }

  const quotaLow = scanStatus?.requests_remaining < 100
  const quotaWarning = scanStatus?.requests_remaining < 50

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Live overview · refreshes every 30s</p>
        </div>
        <button
          onClick={handleScanNow}
          disabled={scanning || scanStatus?.paused}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {scanning ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Scanning…
            </>
          ) : (
            <>🔄 Scan Now</>
          )}
        </button>
      </div>

      {/* Quota warning */}
      {quotaWarning && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          ⚠️ <strong>API quota critical:</strong> only {scanStatus.requests_remaining} requests remaining this month.
          Consider upgrading your <a href="https://the-odds-api.com" target="_blank" rel="noreferrer" className="underline">Odds API plan</a>.
        </div>
      )}
      {quotaLow && !quotaWarning && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-400">
          ⚠️ API quota low: {scanStatus.requests_remaining} requests remaining this month.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Arbitrage" value={stats?.arbTotal ?? 0} sub="Active opportunities" color="green" to="/arbitrage" />
            <StatCard label="Value Bets" value={stats?.vbTotal ?? 0} sub="Positive EV" color="blue" to="/value-bets" />
            <StatCard label="Events Scanned" value={scanStatus?.events_scanned ?? 0}
              sub={`${scanStatus?.sports_scanned ?? 0} sports · ${scanStatus?.ran_at ? new Date(scanStatus.ran_at).toLocaleTimeString() : 'Never'}`}
              color="purple" />
            <StatCard label="API Quota" value={scanStatus?.requests_remaining ?? '—'}
              sub="Requests remaining" color={quotaWarning ? 'red' : quotaLow ? 'yellow' : 'green'} />
          </div>

          {/* Scanner status */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Scanner</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                scanStatus?.paused ? 'bg-yellow-500/10 text-yellow-400' :
                scanStatus?.status === 'running' ? 'bg-green-500/10 text-green-400' :
                scanStatus?.status === 'error' ? 'bg-red-500/10 text-red-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {scanStatus?.paused ? 'Paused' : scanStatus?.status ?? 'idle'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Arb Found', value: scanStatus?.arb_found ?? 0, color: 'text-green-400' },
                { label: 'Value Found', value: scanStatus?.value_found ?? 0, color: 'text-blue-400' },
                { label: 'Sports', value: scanStatus?.sports_scanned ?? 0 },
                { label: 'Poll Interval', value: '12 hrs' },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-gray-500">{r.label}</p>
                  <p className={`font-semibold mt-1 ${r.color ?? 'text-white'}`}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sports covered */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Sports Covered</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                ['⚽', 'EPL, UCL, La Liga, Bundesliga'],
                ['🏀', 'NBA'],
              ].map(([icon, label]) => (
                <span key={label} className="bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg">
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
