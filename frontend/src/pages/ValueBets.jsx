import { useEffect, useState, useCallback } from 'react'
import api from '../api'

const SIGNAL = {
  bet:     { emoji: '🟢', label: 'Bet',     color: 'text-green-400 bg-green-500/10' },
  caution: { emoji: '🟡', label: 'Caution', color: 'text-yellow-400 bg-yellow-500/10' },
  skip:    { emoji: '🔴', label: 'Skip',    color: 'text-red-400 bg-red-500/10' },
}
const PRIORITY_BOOKS = new Set(['betway', 'onexbet'])

const SPORT_GROUPS = {
  '⚽ Football': 'soccer',
  '🏀 Basketball': 'basketball',
  '🎾 Tennis': 'tennis',
}

function SignalBadge({ signal }) {
  const s = SIGNAL[signal] ?? SIGNAL.caution
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.emoji} {s.label}</span>
}

function VbCard({ item }) {
  const isPriority = PRIORITY_BOOKS.has(item.bookmaker)
  const kellyPct = (item.kelly_fraction * 100).toFixed(1)
  const evColor = item.ev_pct >= 5 ? 'text-green-400' : item.ev_pct >= 2 ? 'text-yellow-400' : 'text-gray-400'

  return (
    <div className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${
      isPriority ? 'border-blue-500/30 hover:border-blue-500/50' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{item.match_name}</p>
            {isPriority && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full shrink-0">⭐ {item.bookmaker}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.sport_title} · {new Date(item.commence_time).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SignalBadge signal={item.signal} />
          <span className={`text-sm font-bold px-3 py-1 rounded-full bg-blue-500/10 ${evColor}`}>
            +{item.ev_pct.toFixed(2)}% EV
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          { label: 'Bookmaker', value: item.bookmaker, cls: isPriority ? 'text-blue-400 capitalize' : 'capitalize' },
          { label: 'Outcome', value: item.outcome },
          { label: 'Odds', value: item.odds.toFixed(2), cls: 'font-mono text-blue-400 font-semibold' },
          { label: 'True Prob', value: `${(item.true_prob * 100).toFixed(1)}%` },
        ].map(c => (
          <div key={c.label} className="bg-gray-800 rounded-lg px-3 py-2">
            <p className="text-gray-500 text-xs mb-0.5">{c.label}</p>
            <p className={`font-medium ${c.cls ?? ''}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>Kelly stake: <span className="text-white font-medium">{kellyPct}%</span> of bankroll</span>
        <span>{item.sharp_books_agree} sharp book{item.sharp_books_agree !== 1 ? 's' : ''} agree</span>
      </div>
    </div>
  )
}

export default function ValueBets() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [activeGroup, setActiveGroup] = useState('All')
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (priorityOnly) params.priority = true
      const { data } = await api.get('/value-bets', { params })
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, priorityOnly])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const displayed = activeGroup === 'All'
    ? items
    : items.filter(i => i.sport_key?.startsWith(SPORT_GROUPS[activeGroup] ?? ''))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Value Bets</h1>
          <p className="text-gray-500 text-sm mt-1">{total} bets with positive EV · sorted by signal then EV%</p>
        </div>
        <button onClick={() => { setPriorityOnly(p => !p); setPage(1) }}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
            priorityOnly ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}>
          ⭐ Betway/1xBet only
        </button>
      </div>

      {/* Sport tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['All', ...Object.keys(SPORT_GROUPS)].map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              activeGroup === g ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {g}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-5 text-xs text-gray-500">
        <span>Signal:</span>
        {Object.entries(SIGNAL).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded-full ${v.color}`}>{v.emoji} {v.label}</span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">💎</p>
          <p className="font-medium">No value bets right now</p>
        </div>
      ) : (
        <div className="space-y-4">{displayed.map(item => <VbCard key={item.id} item={item} />)}</div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">← Prev</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">Next →</button>
        </div>
      )}
    </div>
  )
}
