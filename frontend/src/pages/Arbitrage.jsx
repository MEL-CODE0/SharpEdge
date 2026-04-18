import { useEffect, useState, useCallback } from 'react'
import api from '../api'

const SIGNAL = {
  bet:     { emoji: '🟢', label: 'Bet',     color: 'text-green-400 bg-green-500/10' },
  caution: { emoji: '🟡', label: 'Caution', color: 'text-yellow-400 bg-yellow-500/10' },
  skip:    { emoji: '🔴', label: 'Skip',    color: 'text-red-400 bg-red-500/10' },
}

const PRIORITY_BOOKS = new Set(['betway', 'onexbet'])

function SignalBadge({ signal }) {
  const s = SIGNAL[signal] ?? SIGNAL.caution
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>
      {s.emoji} {s.label}
    </span>
  )
}

function ArbCard({ item }) {
  const isPriority = item.is_priority || item.legs?.every(l => PRIORITY_BOOKS.has(l.bookmaker))
  return (
    <div className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${
      isPriority ? 'border-green-500/40 hover:border-green-500/60' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{item.match_name}</p>
            {isPriority && (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full shrink-0">
                ⭐ Betway/1xBet
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.sport_title} · {new Date(item.commence_time).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SignalBadge signal={item.signal} />
          <span className="bg-green-500/10 text-green-400 text-sm font-bold px-3 py-1 rounded-full">
            +{item.profit_pct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {(item.legs || []).map((leg, i) => (
          <div key={i} className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${
            PRIORITY_BOOKS.has(leg.bookmaker) ? 'bg-green-950/50 border border-green-900/50' : 'bg-gray-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`capitalize font-medium ${PRIORITY_BOOKS.has(leg.bookmaker) ? 'text-green-400' : 'text-gray-400'}`}>
                {leg.bookmaker}
              </span>
              <span className="text-gray-600">·</span>
              <span>{leg.outcome}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400 font-mono font-semibold">{leg.odds.toFixed(2)}</span>
              <span className="text-gray-500 text-xs">Stake {leg.stake_pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Arbitrage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState('')
  const [sports, setSports] = useState([])
  const [priorityOnly, setPriorityOnly] = useState(false)
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (sport) params.sport = sport
      const { data } = await api.get('/opportunities', { params })
      let list = data.items ?? []
      if (priorityOnly) list = list.filter(i => i.is_priority)
      setItems(list)
      setTotal(data.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, sport, priorityOnly])

  useEffect(() => {
    api.get('/opportunities/sports').then(({ data }) => setSports(Array.isArray(data) ? data : []))
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Arbitrage</h1>
          <p className="text-gray-500 text-sm mt-1">{total} active opportunities · refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setPriorityOnly(p => !p); setPage(1) }}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              priorityOnly
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            ⭐ Betway/1xBet only
          </button>
          <select
            value={sport}
            onChange={(e) => { setSport(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
          >
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s.key} value={s.key}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Signal legend */}
      <div className="flex items-center gap-4 mb-5 text-xs text-gray-500">
        <span>Signal:</span>
        {Object.entries(SIGNAL).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded-full ${v.color}`}>{v.emoji} {v.label}</span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">⚡</p>
          <p className="font-medium">No arbitrage opportunities right now</p>
          <p className="text-sm mt-1">The scanner checks every 60 seconds</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => <ArbCard key={item.id} item={item} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">← Prev</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">Next →</button>
        </div>
      )}
    </div>
  )
}
