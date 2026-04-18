import { useEffect, useState, useCallback } from 'react'
import api from '../api'

function VbCard({ item }) {
  const kellyPct = (item.kelly_fraction * 100).toFixed(1)
  const evColor = item.ev_pct >= 5 ? 'text-green-400' : item.ev_pct >= 2 ? 'text-yellow-400' : 'text-gray-400'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{item.match_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.sport_title} · {new Date(item.commence_time).toLocaleString()}
          </p>
        </div>
        <span className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full bg-blue-500/10 ${evColor}`}>
          +{item.ev_pct.toFixed(2)}% EV
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-gray-500 text-xs mb-0.5">Bookmaker</p>
          <p className="font-medium capitalize">{item.bookmaker}</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-gray-500 text-xs mb-0.5">Outcome</p>
          <p className="font-medium">{item.outcome}</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-gray-500 text-xs mb-0.5">Odds</p>
          <p className="font-mono font-semibold text-blue-400">{item.odds.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-gray-500 text-xs mb-0.5">True Prob</p>
          <p className="font-medium">{(item.true_prob * 100).toFixed(1)}%</p>
        </div>
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
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/value-bets', { params: { page, page_size: PAGE_SIZE } })
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Value Bets</h1>
        <p className="text-gray-500 text-sm mt-1">
          {total} bets with positive expected value · sorted by EV%
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">💎</p>
          <p className="font-medium">No value bets right now</p>
          <p className="text-sm mt-1">Sharp book consensus is used to detect edge</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => <VbCard key={item.id} item={item} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
