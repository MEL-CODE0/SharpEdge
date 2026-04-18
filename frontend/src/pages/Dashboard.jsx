import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

function StatCard({ label, value, sub, color = 'green', to }) {
  const colours = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  }
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

  useEffect(() => {
    const load = async () => {
      try {
        const [arb, vb, scan] = await Promise.all([
          api.get('/opportunities?page_size=1'),
          api.get('/value-bets?page_size=1'),
          api.get('/scanner/status'),
        ])
        setStats({ arbTotal: arb.data.total, vbTotal: vb.data.total })
        setScanStatus(scan.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Live overview of current opportunities</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Arbitrage Opportunities"
              value={stats?.arbTotal ?? 0}
              sub="Active right now"
              color="green"
              to="/arbitrage"
            />
            <StatCard
              label="Value Bets"
              value={stats?.vbTotal ?? 0}
              sub="Positive EV"
              color="blue"
              to="/value-bets"
            />
            <StatCard
              label="Events Scanned"
              value={scanStatus?.events_scanned ?? 0}
              sub={`Last scan: ${scanStatus?.ran_at ? new Date(scanStatus.ran_at).toLocaleTimeString() : 'Never'}`}
              color="purple"
            />
            <StatCard
              label="API Quota Left"
              value={scanStatus?.requests_remaining ?? '—'}
              sub="The Odds API requests"
              color="yellow"
            />
          </div>

          {/* Scanner status banner */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Scanner Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <p className={`font-medium mt-1 ${
                  scanStatus?.status === 'running' ? 'text-green-400' :
                  scanStatus?.status === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {scanStatus?.status ?? 'idle'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Sports Scanned</p>
                <p className="font-medium mt-1">{scanStatus?.sports_scanned ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Arb Found</p>
                <p className="font-medium mt-1 text-green-400">{scanStatus?.arb_found ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Value Found</p>
                <p className="font-medium mt-1 text-blue-400">{scanStatus?.value_found ?? 0}</p>
              </div>
            </div>
            {scanStatus?.error && (
              <p className="mt-4 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                {scanStatus.error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
