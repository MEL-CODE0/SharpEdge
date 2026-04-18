import { useEffect, useState, useCallback } from 'react'
import api from '../api'

const SPORT_GROUPS = {
  '⚽ Football': 'soccer',
  '🏀 Basketball': 'basketball',
  '🎾 Tennis': 'tennis',
}

const SIGNAL_STYLE = {
  bet:     'text-green-400 bg-green-500/10',
  caution: 'text-yellow-400 bg-yellow-500/10',
  skip:    'text-red-400 bg-red-500/10',
}

function HistoryCard({ item }) {
  const isArb = item.type === 'arb'
  const sig = SIGNAL_STYLE[item.signal] ?? SIGNAL_STYLE.caution

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isArb ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {isArb ? '⚡ Arb' : '💎 Value'}
            </span>
            {item.is_priority && <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">⭐ Priority</span>}
          </div>
          <p className="font-semibold text-sm mt-1.5 truncate">{item.match_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{item.sport_title}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sig}`}>
            {item.signal === 'bet' ? '🟢' : item.signal === 'caution' ? '🟡' : '🔴'} {item.signal}
          </span>
          {isArb
            ? <span className="text-green-400 font-bold text-sm">+{item.profit_pct?.toFixed(2)}%</span>
            : <span className="text-blue-400 font-bold text-sm">+{item.ev_pct?.toFixed(2)}% EV</span>
          }
        </div>
      </div>

      {!isArb && (
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
          <span className="capitalize">{item.bookmaker}</span>
          <span>·</span>
          <span>{item.outcome}</span>
          <span>·</span>
          <span className="text-blue-400 font-mono">{item.odds?.toFixed(2)}</span>
        </div>
      )}

      {isArb && item.legs && (
        <div className="flex flex-wrap gap-2 mt-2">
          {item.legs.map((leg, i) => (
            <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg capitalize">
              {leg.bookmaker} · {leg.outcome} · {leg.odds?.toFixed(2)}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
        <span>Match: {item.commence_time ? new Date(item.commence_time).toLocaleDateString() : '—'}</span>
        <span>Detected: {item.detected_at ? new Date(item.detected_at).toLocaleString() : '—'}</span>
      </div>
    </div>
  )
}

export default function History() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('all')
  const [activeGroup, setActiveGroup] = useState('All')
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE, type }
      const sportPrefix = SPORT_GROUPS[activeGroup]
      if (sportPrefix) params.sport = sportPrefix
      const { data } = await api.get('/history', { params })
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, type, activeGroup])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-gray-500 text-sm mt-1">{total} past opportunities</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {[['all', 'All'], ['arb', '⚡ Arbitrage'], ['value', '💎 Value Bets']].map(([val, label]) => (
          <button key={val} onClick={() => { setType(val); setPage(1) }}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              type === val ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sport tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['All', ...Object.keys(SPORT_GROUPS)].map(g => (
          <button key={g} onClick={() => { setActiveGroup(g); setPage(1) }}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              activeGroup === g ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No history yet</p>
          <p className="text-sm mt-1">Past opportunities appear here after each scanner cycle</p>
        </div>
      ) : (
        <div className="space-y-3">{items.map((item, i) => <HistoryCard key={`${item.type}-${item.id}-${i}`} item={item} />)}</div>
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
