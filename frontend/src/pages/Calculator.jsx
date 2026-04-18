import { useState } from 'react'

// ── Arbitrage Calculator ──────────────────────────────────────
function ArbCalc() {
  const [bankroll, setBankroll] = useState('')
  const [legs, setLegs] = useState([
    { outcome: 'Home', odds: '', bookmaker: '' },
    { outcome: 'Away', odds: '', bookmaker: '' },
  ])
  const [result, setResult] = useState(null)

  const addLeg = () => setLegs([...legs, { outcome: 'Draw', odds: '', bookmaker: '' }])
  const removeLeg = (i) => setLegs(legs.filter((_, idx) => idx !== i))
  const updateLeg = (i, field, val) => {
    const next = [...legs]
    next[i] = { ...next[i], [field]: val }
    setLegs(next)
  }

  const calculate = () => {
    const bank = parseFloat(bankroll)
    const parsed = legs.map(l => ({ ...l, oddsNum: parseFloat(l.odds) }))
    if (!bank || parsed.some(l => !l.oddsNum || l.oddsNum <= 1)) {
      setResult({ error: 'Enter valid odds (> 1) and bankroll' })
      return
    }
    const implied = parsed.reduce((s, l) => s + 1 / l.oddsNum, 0)
    if (implied >= 1) {
      setResult({ error: `No arbitrage — implied total is ${(implied * 100).toFixed(2)}% (need < 100%)` })
      return
    }
    const profit_pct = (1 / implied - 1) * 100
    const stakeLegs = parsed.map(l => ({
      ...l,
      stake: (bank * (1 / l.oddsNum) / implied),
      payout: bank / implied,
    }))
    setResult({ profit_pct, implied, stakeLegs, payout: bank / implied })
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">⚡ Arbitrage Calculator</h2>
      <p className="text-gray-500 text-sm mb-5">Enter the best odds for each outcome across bookmakers</p>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1.5">Total Bankroll (GHS / USD)</label>
        <input type="number" value={bankroll} onChange={e => setBankroll(e.target.value)}
          placeholder="e.g. 1000"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
      </div>

      <div className="space-y-3 mb-4">
        {legs.map((leg, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input value={leg.outcome} onChange={e => updateLeg(i, 'outcome', e.target.value)}
              placeholder="Outcome"
              className="col-span-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            <input value={leg.bookmaker} onChange={e => updateLeg(i, 'bookmaker', e.target.value)}
              placeholder="Bookmaker"
              className="col-span-4 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            <input type="number" value={leg.odds} onChange={e => updateLeg(i, 'odds', e.target.value)}
              placeholder="Odds"
              className="col-span-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            <button onClick={() => removeLeg(i)} disabled={legs.length <= 2}
              className="col-span-2 text-gray-600 hover:text-red-400 disabled:opacity-30 text-lg font-bold transition-colors text-center">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-5">
        <button onClick={addLeg}
          className="text-sm text-gray-400 hover:text-white bg-gray-800 px-4 py-2 rounded-lg transition-colors">
          + Add outcome (Draw)
        </button>
        <button onClick={calculate}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm">
          Calculate
        </button>
      </div>

      {result && (
        result.error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{result.error}</div>
        ) : (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-green-400 font-bold text-lg">+{result.profit_pct.toFixed(2)}% guaranteed profit</span>
              <span className="text-gray-400 text-sm">Implied: {(result.implied * 100).toFixed(2)}%</span>
            </div>
            <div className="space-y-2">
              {result.stakeLegs.map((l, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{l.outcome}</span>
                    {l.bookmaker && <span className="text-gray-500 ml-2 capitalize">@ {l.bookmaker}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 font-mono font-semibold">{l.oddsNum.toFixed(2)}</span>
                    <span className="text-gray-400 mx-2">→ Stake</span>
                    <span className="font-semibold">{l.stake.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm border-t border-green-500/20 pt-3">
              <span className="text-gray-400">Guaranteed payout (any outcome)</span>
              <span className="font-bold text-green-400">{result.payout.toFixed(2)}</span>
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── Kelly Calculator ──────────────────────────────────────────
function KellyCalc() {
  const [form, setForm] = useState({ odds: '', prob: '', bankroll: '', fraction: '1' })
  const [result, setResult] = useState(null)

  const calculate = () => {
    const odds = parseFloat(form.odds)
    const prob = parseFloat(form.prob) / 100
    const bank = parseFloat(form.bankroll)
    const frac = parseFloat(form.fraction)

    if (!odds || !prob || odds <= 1 || prob <= 0 || prob >= 1) {
      setResult({ error: 'Enter valid odds (> 1) and probability (1–99%)' })
      return
    }
    const b = odds - 1
    const q = 1 - prob
    const kelly = (b * prob - q) / b
    const ev = (odds * prob - 1) * 100

    if (kelly <= 0) {
      setResult({ error: `No edge — Kelly is ${(kelly * 100).toFixed(2)}%. This bet has negative expected value.` })
      return
    }

    const appliedKelly = kelly * frac
    const stake = bank ? bank * appliedKelly : null

    setResult({ kelly, appliedKelly, ev, stake, bank })
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">💰 Kelly Criterion Calculator</h2>
      <p className="text-gray-500 text-sm mb-5">Calculate optimal stake based on your edge</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { label: 'Decimal Odds', key: 'odds', placeholder: 'e.g. 2.10' },
          { label: 'Your Est. Probability (%)', key: 'prob', placeholder: 'e.g. 55' },
          { label: 'Bankroll (optional)', key: 'bankroll', placeholder: 'e.g. 500' },
        ].map(f => (
          <div key={f.key} className={f.key === 'bankroll' ? 'col-span-2' : ''}>
            <label className="block text-sm text-gray-400 mb-1.5">{f.label}</label>
            <input type="number" value={form[f.key]} placeholder={f.placeholder}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        ))}
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1.5">Kelly Fraction</label>
          <div className="flex gap-2">
            {[['Full Kelly', '1'], ['Half Kelly', '0.5'], ['Quarter Kelly', '0.25']].map(([label, val]) => (
              <button key={val} onClick={() => setForm({ ...form, fraction: val })}
                className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                  form.fraction === val ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={calculate}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mb-4">
        Calculate
      </button>

      {result && (
        result.error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{result.error}</div>
        ) : (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Expected Value', value: `+${result.ev.toFixed(2)}%`, color: 'text-green-400' },
                { label: 'Full Kelly', value: `${(result.kelly * 100).toFixed(2)}% of bankroll`, color: 'text-blue-400' },
                { label: `Applied Kelly (×${form.fraction})`, value: `${(result.appliedKelly * 100).toFixed(2)}%`, color: 'text-blue-400' },
                ...(result.stake ? [{ label: 'Recommended Stake', value: result.stake.toFixed(2), color: 'text-white font-bold' }] : []),
              ].map(r => (
                <div key={r.label} className="bg-gray-800 rounded-lg px-3 py-2.5">
                  <p className="text-gray-500 text-xs mb-0.5">{r.label}</p>
                  <p className={`font-semibold ${r.color}`}>{r.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Half/Quarter Kelly recommended for real betting — full Kelly is mathematically optimal but has high variance.
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ── EV Calculator ─────────────────────────────────────────────
function EVCalc() {
  const [form, setForm] = useState({ odds: '', trueProb: '' })
  const [result, setResult] = useState(null)

  const calculate = () => {
    const odds = parseFloat(form.odds)
    const prob = parseFloat(form.trueProb) / 100
    if (!odds || !prob || odds <= 1 || prob <= 0 || prob >= 1) {
      setResult({ error: 'Enter valid odds (> 1) and probability (1–99%)' })
      return
    }
    const ev = (odds * prob - 1) * 100
    const impliedProb = (1 / odds) * 100
    const edge = prob * 100 - impliedProb
    setResult({ ev, impliedProb, edge, hasValue: ev > 0 })
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">📊 Expected Value Calculator</h2>
      <p className="text-gray-500 text-sm mb-5">Is the bookmaker's price giving you value?</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Bookmaker Odds</label>
          <input type="number" value={form.odds} placeholder="e.g. 2.50"
            onChange={e => setForm({ ...form, odds: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Your True Prob (%)</label>
          <input type="number" value={form.trueProb} placeholder="e.g. 45"
            onChange={e => setForm({ ...form, trueProb: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
        </div>
      </div>

      <button onClick={calculate}
        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mb-4">
        Calculate EV
      </button>

      {result && (
        result.error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{result.error}</div>
        ) : (
          <div className={`p-4 rounded-xl border space-y-3 text-sm ${
            result.hasValue ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <p className={`font-bold text-lg ${result.hasValue ? 'text-green-400' : 'text-red-400'}`}>
              {result.hasValue ? `✅ +${result.ev.toFixed(2)}% EV — Value bet` : `❌ ${result.ev.toFixed(2)}% EV — No value`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Book Implied Prob', value: `${result.impliedProb.toFixed(2)}%` },
                { label: 'Your True Prob', value: `${form.trueProb}%` },
                { label: 'Your Edge', value: `${result.edge.toFixed(2)}%`, color: result.edge > 0 ? 'text-green-400' : 'text-red-400' },
                { label: 'Expected Value', value: `${result.ev.toFixed(2)}%`, color: result.hasValue ? 'text-green-400' : 'text-red-400' },
              ].map(r => (
                <div key={r.label} className="bg-gray-800 rounded-lg px-3 py-2.5">
                  <p className="text-gray-500 text-xs mb-0.5">{r.label}</p>
                  <p className={`font-semibold ${r.color ?? 'text-white'}`}>{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── Odds Converter ────────────────────────────────────────────
function OddsConverter() {
  const [input, setInput] = useState('')
  const [from, setFrom] = useState('decimal')

  const parse = (val, type) => {
    const v = val.trim()
    if (!v) return null
    try {
      if (type === 'decimal') {
        const d = parseFloat(v)
        return d > 1 ? d : null
      }
      if (type === 'american') {
        const a = parseFloat(v)
        if (isNaN(a)) return null
        return a > 0 ? (a / 100) + 1 : (100 / Math.abs(a)) + 1
      }
      if (type === 'fractional') {
        const parts = v.split('/')
        if (parts.length === 2) {
          const [n, d] = parts.map(Number)
          return d ? (n / d) + 1 : null
        }
        return null
      }
      if (type === 'implied') {
        const p = parseFloat(v)
        return (p > 0 && p < 100) ? 100 / p : null
      }
    } catch { return null }
    return null
  }

  const decimal = parse(input, from)

  const toAmerican = (d) => {
    if (!d || d <= 1) return '—'
    if (d >= 2) return `+${Math.round((d - 1) * 100)}`
    return `${Math.round(-100 / (d - 1))}`
  }
  const toFractional = (d) => {
    if (!d || d <= 1) return '—'
    const n = d - 1
    // Find GCD for simplification
    const gcd = (a, b) => b < 0.001 ? a : gcd(b, a % b)
    const mult = 100
    const num = Math.round(n * mult)
    const den = mult
    const g = gcd(num, den)
    return `${num / g}/${den / g}`
  }
  const toImplied = (d) => d ? `${(100 / d).toFixed(2)}%` : '—'

  const results = decimal ? [
    { label: 'Decimal', value: decimal.toFixed(3) },
    { label: 'American', value: toAmerican(decimal) },
    { label: 'Fractional', value: toFractional(decimal) },
    { label: 'Implied %', value: toImplied(decimal) },
  ] : []

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">💱 Odds Converter</h2>
      <p className="text-gray-500 text-sm mb-5">Convert between any odds format instantly</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Input format</label>
          <select value={from} onChange={e => { setFrom(e.target.value); setInput('') }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500">
            <option value="decimal">Decimal (e.g. 2.50)</option>
            <option value="american">American (e.g. +150 or -200)</option>
            <option value="fractional">Fractional (e.g. 3/2)</option>
            <option value="implied">Implied % (e.g. 45)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            {from === 'decimal' ? 'Decimal odds' : from === 'american' ? 'American odds' : from === 'fractional' ? 'Fractional (n/d)' : 'Probability (%)'}
          </label>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder={from === 'decimal' ? '2.50' : from === 'american' ? '+150' : from === 'fractional' ? '3/2' : '40'}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
        </div>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {results.map(r => (
            <div key={r.label} className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">{r.label}</p>
              <p className="text-orange-400 font-bold font-mono text-lg">{r.value}</p>
            </div>
          ))}
        </div>
      ) : input ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Invalid input for {from} format
        </div>
      ) : (
        <div className="p-4 bg-gray-800 rounded-xl text-gray-600 text-sm text-center">
          Enter odds above to see conversions
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Calculator() {
  const [tab, setTab] = useState('arb')
  const tabs = [
    { key: 'arb', label: '⚡ Arbitrage' },
    { key: 'kelly', label: '💰 Kelly Stake' },
    { key: 'ev', label: '📊 Value / EV' },
    { key: 'convert', label: '💱 Convert' },
  ]

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calculator</h1>
        <p className="text-gray-500 text-sm mt-1">Stake sizing, arbitrage, EV and odds conversion tools</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'arb' && <ArbCalc />}
      {tab === 'kelly' && <KellyCalc />}
      {tab === 'ev' && <EVCalc />}
      {tab === 'convert' && <OddsConverter />}
    </div>
  )
}
