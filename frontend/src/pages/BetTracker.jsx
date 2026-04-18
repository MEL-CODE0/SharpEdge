import { useEffect, useState, useCallback } from 'react'
import api from '../api'

const SPORTS = ['Football', 'Basketball', 'Tennis', 'Other']
const BET_TYPES = ['manual', 'arb', 'value']
const RESULTS = ['pending', 'win', 'loss', 'void']

const RESULT_STYLE = {
  win:     'text-green-400 bg-green-500/10 border-green-500/20',
  loss:    'text-red-400 bg-red-500/10 border-red-500/20',
  void:    'text-gray-400 bg-gray-700/30 border-gray-600/20',
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

const emptyForm = {
  match_name: '', sport: 'Football', bookmaker: '', outcome: '',
  bet_type: 'manual', odds: '', stake: '', notes: '',
}

function AddBetModal({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/bets', {
        ...form,
        odds: parseFloat(form.odds),
        stake: parseFloat(form.stake),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to save bet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Log a Bet</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Match / Event *</label>
            <input value={form.match_name} onChange={e => setForm({...form, match_name: e.target.value})}
              placeholder="e.g. Arsenal vs Chelsea"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sport</label>
              <select value={form.sport} onChange={e => setForm({...form, sport: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                {SPORTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bet Type</label>
              <select value={form.bet_type} onChange={e => setForm({...form, bet_type: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 capitalize">
                {BET_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bookmaker</label>
              <input value={form.bookmaker} onChange={e => setForm({...form, bookmaker: e.target.value})}
                placeholder="e.g. Betway"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Outcome</label>
              <input value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})}
                placeholder="e.g. Home, Over 2.5"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Odds *</label>
              <input type="number" step="0.01" value={form.odds} onChange={e => setForm({...form, odds: e.target.value})}
                placeholder="e.g. 2.10"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stake *</label>
              <input type="number" step="0.01" value={form.stake} onChange={e => setForm({...form, stake: e.target.value})}
                placeholder="e.g. 50"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              placeholder="Any notes about this bet..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-1">
            {loading ? 'Saving…' : 'Log Bet'}
          </button>
        </form>
      </div>
    </div>
  )
}

function BetCard({ bet, onUpdate, onDelete }) {
  const [updating, setUpdating] = useState(false)

  const handleResult = async (result) => {
    setUpdating(true)
    try {
      await api.patch(`/bets/${bet.id}`, { result })
      onUpdate()
    } finally {
      setUpdating(false)
    }
  }

  const profitDisplay = bet.profit !== null && bet.profit !== undefined
    ? (bet.profit >= 0 ? `+${bet.profit.toFixed(2)}` : bet.profit.toFixed(2))
    : '—'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{bet.match_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {bet.sport && <span>{bet.sport} · </span>}
            {bet.bookmaker && <span className="capitalize">{bet.bookmaker} · </span>}
            {bet.outcome && <span>{bet.outcome} · </span>}
            <span className="capitalize">{bet.bet_type}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${RESULT_STYLE[bet.result] ?? RESULT_STYLE.pending} capitalize`}>
            {bet.result}
          </span>
          <span className={`text-sm font-bold font-mono ${bet.profit > 0 ? 'text-green-400' : bet.profit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {profitDisplay}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>Odds <span className="text-white font-mono">{bet.odds?.toFixed(2)}</span></span>
        <span>Stake <span className="text-white font-mono">{bet.stake?.toFixed(2)}</span></span>
        <span className="ml-auto">{new Date(bet.placed_at).toLocaleDateString()}</span>
      </div>

      {bet.notes && (
        <p className="text-xs text-gray-500 italic mb-3 border-t border-gray-800 pt-2">{bet.notes}</p>
      )}

      {/* Result buttons */}
      <div className="flex items-center gap-2">
        {['win', 'loss', 'void', 'pending'].map(r => (
          <button key={r} onClick={() => handleResult(r)} disabled={updating || bet.result === r}
            className={`flex-1 text-xs py-1.5 rounded-lg capitalize font-medium transition-colors disabled:opacity-40 ${
              bet.result === r
                ? r === 'win' ? 'bg-green-500 text-white' : r === 'loss' ? 'bg-red-500 text-white' : r === 'void' ? 'bg-gray-600 text-white' : 'bg-yellow-500/30 text-yellow-300'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {r}
          </button>
        ))}
        <button onClick={onDelete}
          className="text-gray-600 hover:text-red-400 transition-colors px-2 text-base">✕</button>
      </div>
    </div>
  )
}

export default function BetTracker() {
  const [bets, setBets] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (filter !== 'all') params.result = filter
      const { data } = await api.get('/bets', { params })
      setBets(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await api.delete(`/bets/${id}`)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const filters = ['all', 'pending', 'win', 'loss', 'void']

  return (
    <div className="p-8">
      {showModal && <AddBetModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bet Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">{total} bets logged</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
          + Log Bet
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`text-sm px-4 py-1.5 rounded-full font-medium capitalize transition-colors ${
              filter === f ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-600">Loading…</div>
      ) : bets.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">📒</p>
          <p className="font-medium">No bets logged yet</p>
          <p className="text-sm mt-1">Click "Log Bet" to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bets.map(bet => (
            <BetCard key={bet.id} bet={bet}
              onUpdate={load}
              onDelete={() => handleDelete(bet.id)} />
          ))}
        </div>
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
