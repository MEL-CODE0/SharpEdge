import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import api from '../api'

const PIE_COLORS = { win: '#22c55e', loss: '#ef4444', void: '#6b7280', pending: '#eab308' }
const BAR_COLOR = '#3b82f6'

function StatBox({ label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bets/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-600 p-8">Loading…</div>

  if (!stats || stats.total === 0) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Stats</h1>
      <p className="text-gray-500 text-sm mb-8">Your betting performance at a glance</p>
      <div className="text-center py-24 text-gray-600">
        <p className="text-4xl mb-3">📈</p>
        <p className="font-medium">No data yet</p>
        <p className="text-sm mt-1">Log bets in the Bet Tracker to see your stats</p>
      </div>
    </div>
  )

  const pieData = [
    { name: 'Win', value: stats.wins },
    { name: 'Loss', value: stats.losses },
    { name: 'Void', value: stats.voids },
    { name: 'Pending', value: stats.pending },
  ].filter(d => d.value > 0)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Stats</h1>
      <p className="text-gray-500 text-sm mb-6">Your betting performance at a glance</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatBox label="Total Bets" value={stats.total} />
        <StatBox label="Win Rate" value={`${stats.win_rate}%`} color="text-green-400" />
        <StatBox label="Total Profit" value={`${stats.total_profit >= 0 ? '+' : ''}${stats.total_profit?.toFixed(2)}`}
          color={stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatBox label="ROI" value={`${stats.roi >= 0 ? '+' : ''}${stats.roi}%`}
          color={stats.roi >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatBox label="Total Staked" value={stats.total_stake?.toFixed(2)} color="text-blue-400" />
        <StatBox label="W / L / P" value={`${stats.wins} / ${stats.losses} / ${stats.pending}`}
          sub="Win / Loss / Pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Profit over time */}
        {stats.timeline?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Cumulative Profit</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v) => [v?.toFixed(2), 'Cumulative']}
                />
                <Line type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Win/Loss pie */}
        {pieData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Result Breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v, name) => [v, name]}
                />
                <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bets by sport */}
        {stats.by_sport?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bets by Sport</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.by_sport} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sport" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  cursor={{ fill: '#1f2937' }}
                />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bets by bookmaker */}
        {stats.by_bookmaker?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bets by Bookmaker</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.by_bookmaker} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="bookmaker" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  cursor={{ fill: '#1f2937' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
