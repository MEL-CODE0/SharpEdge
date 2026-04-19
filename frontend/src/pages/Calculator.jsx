import { useState } from 'react'

// ── Shared signal helper ──────────────────────────────────────
function getSignal(profit_pct) {
  if (profit_pct >= 2.0) return { key: 'bet',     emoji: '🟢', label: 'BET — Strong arb, place both sides now',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' }
  if (profit_pct >= 1.0) return { key: 'caution', emoji: '🟡', label: 'CAUTION — Arb exists, act quickly',        color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
  if (profit_pct >= 0.5) return { key: 'caution', emoji: '🟡', label: 'CAUTION — Thin margin, only if fast',      color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
  return   { key: 'skip',    emoji: '🔴', label: 'SKIP — Margin too small after fees/tax',  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' }
}

// ── Over/Under Arb Calculator ─────────────────────────────────
function OUCalc() {
  const [form, setForm] = useState({
    line:         '',   // e.g. 2.5
    overOdds:     '',
    overBook:     '',
    underOdds:    '',
    underBook:    '',
    bankroll:     '',
  })
  const [result, setResult] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const calculate = () => {
    const over  = parseFloat(form.overOdds)
    const under = parseFloat(form.underOdds)
    const bank  = parseFloat(form.bankroll)
    const line  = parseFloat(form.line)

    if (!over || !under || over <= 1 || under <= 1) {
      setResult({ error: 'Enter valid decimal odds for both Over and Under (must be > 1.0)' })
      return
    }
    if (!bank || bank <= 0) {
      setResult({ error: 'Enter the total amount you want to invest' })
      return
    }

    const implied     = 1 / over + 1 / under
    const overround   = ((implied - 1) * 100).toFixed(2)   // bookmaker's edge when > 0
    const profit_pct  = (1 / implied - 1) * 100

    if (implied >= 1) {
      // No arb — show the overround so user understands the margin against them
      setResult({
        noArb: true,
        implied,
        overround,
        over, under, bank, line,
        overBook:  form.overBook,
        underBook: form.underBook,
      })
      return
    }

    // Arb exists
    const stakeOver  = bank * (1 / over)  / implied
    const stakeUnder = bank * (1 / under) / implied
    const payout     = bank / implied         // guaranteed return (same whichever wins)
    const profit     = payout - bank
    const signal     = getSignal(profit_pct)

    setResult({
      arb: true,
      profit_pct, implied, payout, profit,
      over, under, bank, line,
      stakeOver, stakeUnder,
      overBook:  form.overBook,
      underBook: form.underBook,
      signal,
    })
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
  const labelCls = "block text-sm text-gray-400 mb-1.5"

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">⚖️ Over/Under Arb Calculator</h2>
      <p className="text-gray-500 text-sm mb-5">
        Enter the best Over odds from one bookmaker and the best Under odds from another.
        The calculator tells you exactly how much to stake on each side and whether to bet.
      </p>

      {/* How it works */}
      <div className="bg-gray-800/60 rounded-xl px-4 py-3 mb-5 text-xs text-gray-400 leading-relaxed">
        <span className="text-orange-400 font-semibold">How it works: </span>
        If <span className="font-mono text-white">(1÷Over odds) + (1÷Under odds) &lt; 1.0</span>, an arb exists.
        You split your bankroll across both sides so you win the same amount regardless of the final score.
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Line */}
        <div className="col-span-2">
          <label className={labelCls}>Goals / Points Line (e.g. 2.5)</label>
          <input type="number" step="0.5" value={form.line} onChange={e => set('line', e.target.value)}
            placeholder="e.g. 2.5" className={inputCls} />
        </div>

        {/* Over side */}
        <div className="col-span-2">
          <p className="text-xs text-orange-300 font-semibold uppercase tracking-wider mb-2">Over side</p>
        </div>
        <div>
          <label className={labelCls}>Over Odds</label>
          <input type="number" step="0.01" value={form.overOdds} onChange={e => set('overOdds', e.target.value)}
            placeholder="e.g. 2.10" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Bookmaker</label>
          <input value={form.overBook} onChange={e => set('overBook', e.target.value)}
            placeholder="e.g. Betway" className={inputCls} />
        </div>

        {/* Under side */}
        <div className="col-span-2">
          <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-2 mt-1">Under side</p>
        </div>
        <div>
          <label className={labelCls}>Under Odds</label>
          <input type="number" step="0.01" value={form.underOdds} onChange={e => set('underOdds', e.target.value)}
            placeholder="e.g. 2.20" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Bookmaker</label>
          <input value={form.underBook} onChange={e => set('underBook', e.target.value)}
            placeholder="e.g. 1xBet" className={inputCls} />
        </div>

        {/* Bankroll */}
        <div className="col-span-2">
          <label className={labelCls}>Total Amount to Invest (GHS / any currency)</label>
          <input type="number" value={form.bankroll} onChange={e => set('bankroll', e.target.value)}
            placeholder="e.g. 500" className={inputCls} />
        </div>
      </div>

      <button onClick={calculate}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mb-4">
        Calculate
      </button>

      {/* ── Results ── */}
      {result && (
        result.error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{result.error}</div>
        ) : result.noArb ? (
          <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
            <p className="text-red-400 font-bold text-base">🔴 SKIP — No arbitrage here</p>
            <p className="text-sm text-gray-400">
              The implied total is <span className="font-mono text-white">{(result.implied * 100).toFixed(3)}%</span> — it needs to be
              below <span className="font-mono text-white">100%</span> for an arb to exist.
            </p>
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm">
              <p className="text-gray-500 text-xs mb-2">Breakdown</p>
              <div className="flex justify-between mb-1">
                <span className="text-orange-300">Over {result.line || ''} ({result.overBook || 'Book A'})</span>
                <span className="font-mono">{result.over.toFixed(2)} → {(100 / result.over).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-blue-300">Under {result.line || ''} ({result.underBook || 'Book B'})</span>
                <span className="font-mono">{result.under.toFixed(2)} → {(100 / result.under).toFixed(2)}%</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-gray-400">Bookmaker overround</span>
                <span className="text-red-400 font-semibold">+{result.overround}% against you</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Try finding better odds on another bookmaker. You need the implied sum to drop below 100%.
            </p>
          </div>
        ) : (
          <div className={`p-5 border rounded-xl space-y-4 ${result.signal.bg}`}>
            {/* Signal banner */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{result.signal.emoji}</span>
              <div>
                <p className={`font-bold text-base ${result.signal.color}`}>{result.signal.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Implied sum: {(result.implied * 100).toFixed(3)}% · Profit locked regardless of outcome
                </p>
              </div>
            </div>

            {/* Profit summary */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-800/80 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-500 text-xs mb-1">Profit %</p>
                <p className="text-green-400 font-bold font-mono text-lg">+{result.profit_pct.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-800/80 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-500 text-xs mb-1">Guaranteed return</p>
                <p className="text-white font-bold font-mono text-lg">{result.payout.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800/80 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-500 text-xs mb-1">Net profit</p>
                <p className="text-green-400 font-bold font-mono text-lg">+{result.profit.toFixed(2)}</p>
              </div>
            </div>

            {/* Stake instructions */}
            <div className="space-y-2 text-sm">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">What to stake</p>
              <div className="flex items-center justify-between bg-gray-800/80 rounded-lg px-4 py-3 border border-orange-500/20">
                <div>
                  <p className="text-orange-300 font-semibold">
                    Over {result.line || ''} @ {result.over.toFixed(2)}
                  </p>
                  {result.overBook && <p className="text-gray-500 text-xs capitalize mt-0.5">@ {result.overBook}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono text-lg">{result.stakeOver.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">{((result.stakeOver / result.bank) * 100).toFixed(1)}% of bankroll</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-800/80 rounded-lg px-4 py-3 border border-blue-500/20">
                <div>
                  <p className="text-blue-300 font-semibold">
                    Under {result.line || ''} @ {result.under.toFixed(2)}
                  </p>
                  {result.underBook && <p className="text-gray-500 text-xs capitalize mt-0.5">@ {result.underBook}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono text-lg">{result.stakeUnder.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">{((result.stakeUnder / result.bank) * 100).toFixed(1)}% of bankroll</p>
                </div>
              </div>
            </div>

            {/* Formula */}
            <div className="bg-gray-900/60 rounded-lg px-4 py-3 font-mono text-xs text-gray-400">
              <p className="mb-1">(1÷{result.over.toFixed(2)}) + (1÷{result.under.toFixed(2)}) = <span className="text-green-400">{(result.implied).toFixed(4)}</span> &lt; 1.0 ✓</p>
              <p>Stake Over = {result.bank} × {(1/result.over/result.implied).toFixed(4)} = <span className="text-orange-300">{result.stakeOver.toFixed(2)}</span></p>
              <p>Stake Under = {result.bank} × {(1/result.under/result.implied).toFixed(4)} = <span className="text-blue-300">{result.stakeUnder.toFixed(2)}</span></p>
            </div>

            <p className="text-xs text-gray-500">
              Place both bets as fast as possible — odds can shift. Always verify the odds are still live before placing.
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ── Double Chance Arb Calculator ─────────────────────────────
function DCCalc() {
  const ARB_TYPES = [
    {
      key: 'home_x2',
      label: 'Home (1)  vs  X2',
      desc: 'Back Home at one book, Away or Draw at another',
      sideA: { name: 'Home (1)',          color: 'text-green-300',  border: 'border-green-500/20',  bg: 'bg-green-950/40' },
      sideB: { name: 'X2 (Away or Draw)', color: 'text-purple-300', border: 'border-purple-500/20', bg: 'bg-purple-950/40' },
    },
    {
      key: 'away_1x',
      label: 'Away (2)  vs  1X',
      desc: 'Back Away at one book, Home or Draw at another',
      sideA: { name: 'Away (2)',          color: 'text-blue-300',   border: 'border-blue-500/20',   bg: 'bg-blue-950/40' },
      sideB: { name: '1X (Home or Draw)', color: 'text-orange-300', border: 'border-orange-500/20', bg: 'bg-orange-950/40' },
    },
  ]

  const [arbType, setArbType] = useState('home_x2')
  const [form, setForm] = useState({ oddsA: '', bookA: '', oddsB: '', bookB: '', bankroll: '' })
  const [result, setResult] = useState(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setResult(null) }
  const current = ARB_TYPES.find(t => t.key === arbType)

  const calculate = () => {
    const oddsA  = parseFloat(form.oddsA)
    const oddsB  = parseFloat(form.oddsB)
    const bank   = parseFloat(form.bankroll)

    if (!oddsA || !oddsB || oddsA <= 1 || oddsB <= 1)
      return setResult({ error: 'Enter valid decimal odds for both sides (must be > 1.0)' })
    if (!bank || bank <= 0)
      return setResult({ error: 'Enter the total amount you want to invest' })

    const implied   = 1 / oddsA + 1 / oddsB
    const overround = ((implied - 1) * 100).toFixed(2)

    if (implied >= 1) {
      return setResult({
        noArb: true, implied, overround,
        oddsA, oddsB, bank,
        sideA: current.sideA, sideB: current.sideB,
        bookA: form.bookA, bookB: form.bookB,
      })
    }

    const profit_pct = (1 / implied - 1) * 100
    const stakeA     = bank * (1 / oddsA) / implied
    const stakeB     = bank * (1 / oddsB) / implied
    const payout     = bank / implied
    const profit     = payout - bank
    const signal     = getSignal(profit_pct)

    setResult({
      arb: true,
      profit_pct, implied, payout, profit,
      oddsA, oddsB, bank, stakeA, stakeB,
      sideA: current.sideA, sideB: current.sideB,
      bookA: form.bookA, bookB: form.bookB,
      signal,
    })
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
  const labelCls = "block text-sm text-gray-400 mb-1.5"

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">🎯 Double Chance Arb Calculator</h2>
      <p className="text-gray-500 text-sm mb-5">
        Back a single outcome against a double chance market across two bookmakers — guaranteed profit if arb exists.
      </p>

      {/* How it works */}
      <div className="bg-gray-800/60 rounded-xl px-4 py-3 mb-5 text-xs text-gray-400 leading-relaxed">
        <span className="text-indigo-400 font-semibold">How it works: </span>
        A double chance bet covers two of the three possible results. Paired with the third outcome at another book,
        <span className="font-mono text-white"> every possible result is covered</span>. If{' '}
        <span className="font-mono text-white">(1÷Odds A) + (1÷Odds B) &lt; 1.0</span>, profit is locked in.
      </div>

      {/* Arb type selector */}
      <div className="mb-5">
        <p className={labelCls}>Arb type</p>
        <div className="grid grid-cols-2 gap-2">
          {ARB_TYPES.map(t => (
            <button key={t.key} onClick={() => { setArbType(t.key); setResult(null) }}
              className={`text-sm px-4 py-3 rounded-xl font-medium transition-colors text-left border ${
                arbType === t.key
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}>
              <p className="font-semibold">{t.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Side A */}
        <div className="col-span-2">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${current.sideA.color}`}>
            Side A — {current.sideA.name}
          </p>
        </div>
        <div>
          <label className={labelCls}>Odds</label>
          <input type="number" step="0.01" value={form.oddsA} onChange={e => set('oddsA', e.target.value)}
            placeholder="e.g. 2.20" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Bookmaker</label>
          <input value={form.bookA} onChange={e => set('bookA', e.target.value)}
            placeholder="e.g. Betway" className={inputCls} />
        </div>

        {/* Side B */}
        <div className="col-span-2">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 mt-1 ${current.sideB.color}`}>
            Side B — {current.sideB.name}
          </p>
        </div>
        <div>
          <label className={labelCls}>Odds</label>
          <input type="number" step="0.01" value={form.oddsB} onChange={e => set('oddsB', e.target.value)}
            placeholder="e.g. 2.10" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Bookmaker</label>
          <input value={form.bookB} onChange={e => set('bookB', e.target.value)}
            placeholder="e.g. 1xBet" className={inputCls} />
        </div>

        {/* Bankroll */}
        <div className="col-span-2">
          <label className={labelCls}>Total Amount to Invest (GHS / any currency)</label>
          <input type="number" value={form.bankroll} onChange={e => set('bankroll', e.target.value)}
            placeholder="e.g. 1000" className={inputCls} />
        </div>
      </div>

      <button onClick={calculate}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mb-4">
        Calculate
      </button>

      {/* ── Results ── */}
      {result && (
        result.error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{result.error}</div>

        ) : result.noArb ? (
          <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
            <p className="text-red-400 font-bold text-base">🔴 SKIP — No arbitrage here</p>
            <p className="text-sm text-gray-400">
              Implied total is <span className="font-mono text-white">{(result.implied * 100).toFixed(3)}%</span> — needs to be under 100%.
            </p>
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className={result.sideA.color}>{result.sideA.name}{result.bookA ? ` (${result.bookA})` : ''}</span>
                <span className="font-mono">{result.oddsA.toFixed(2)} → {(100/result.oddsA).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className={result.sideB.color}>{result.sideB.name}{result.bookB ? ` (${result.bookB})` : ''}</span>
                <span className="font-mono">{result.oddsB.toFixed(2)} → {(100/result.oddsB).toFixed(2)}%</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-gray-400">Bookmaker overround</span>
                <span className="text-red-400 font-semibold">+{result.overround}% against you</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Look for better {result.sideB.name} odds on another bookmaker to flip this into an arb.
            </p>
          </div>

        ) : (
          <div className={`p-5 border rounded-xl space-y-4 ${result.signal.bg}`}>
            {/* Signal */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{result.signal.emoji}</span>
              <div>
                <p className={`font-bold text-base ${result.signal.color}`}>{result.signal.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Implied: {(result.implied * 100).toFixed(3)}% · Profit locked regardless of result
                </p>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-800/80 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-500 text-xs mb-1">Profit %</p>
                <p className="text-green-400 font-bold font-mono text-lg">+{result.profit_pct.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-800/80 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-500 text-xs mb-1">Guaranteed return</p>
                <p className="text-white font-bold font-mono text-lg">{result.payout.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800/80 rounded-lg px-3 py-2.5 text-center">
                <p className="text-gray-500 text-xs mb-1">Net profit</p>
                <p className="text-green-400 font-bold font-mono text-lg">+{result.profit.toFixed(2)}</p>
              </div>
            </div>

            {/* Stake instructions */}
            <div className="space-y-2 text-sm">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">What to stake</p>
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${result.sideA.bg} ${result.sideA.border}`}>
                <div>
                  <p className={`font-semibold ${result.sideA.color}`}>{result.sideA.name} @ {result.oddsA.toFixed(2)}</p>
                  {result.bookA && <p className="text-gray-500 text-xs capitalize mt-0.5">@ {result.bookA}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono text-lg">{result.stakeA.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">{((result.stakeA / result.bank) * 100).toFixed(1)}% of bankroll</p>
                </div>
              </div>
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${result.sideB.bg} ${result.sideB.border}`}>
                <div>
                  <p className={`font-semibold ${result.sideB.color}`}>{result.sideB.name} @ {result.oddsB.toFixed(2)}</p>
                  {result.bookB && <p className="text-gray-500 text-xs capitalize mt-0.5">@ {result.bookB}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono text-lg">{result.stakeB.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">{((result.stakeB / result.bank) * 100).toFixed(1)}% of bankroll</p>
                </div>
              </div>
            </div>

            {/* Formula */}
            <div className="bg-gray-900/60 rounded-lg px-4 py-3 font-mono text-xs text-gray-400">
              <p className="mb-1">(1÷{result.oddsA.toFixed(2)}) + (1÷{result.oddsB.toFixed(2)}) = <span className="text-green-400">{result.implied.toFixed(4)}</span> &lt; 1.0 ✓</p>
              <p>Stake A = {result.bank} × {(1/result.oddsA/result.implied).toFixed(4)} = <span className={result.sideA.color}>{result.stakeA.toFixed(2)}</span></p>
              <p>Stake B = {result.bank} × {(1/result.oddsB/result.implied).toFixed(4)} = <span className={result.sideB.color}>{result.stakeB.toFixed(2)}</span></p>
            </div>

            <p className="text-xs text-gray-500">
              Place both bets immediately — double chance odds shift fast. Verify both are still live before placing.
            </p>
          </div>
        )
      )}
    </div>
  )
}

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
    const signal = getSignal(profit_pct)
    setResult({ profit_pct, implied, stakeLegs, payout: bank / implied, signal })
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
          <div className={`p-4 border rounded-xl space-y-4 ${result.signal.bg}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{result.signal.emoji}</span>
              <div>
                <p className={`font-bold ${result.signal.color}`}>{result.signal.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">+{result.profit_pct.toFixed(2)}% profit · Implied: {(result.implied * 100).toFixed(2)}%</p>
              </div>
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
            <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
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
  const [tab, setTab] = useState('ou')
  const tabs = [
    { key: 'ou',      label: '⚖️ O/U Arb' },
    { key: 'dc',      label: '🎯 Double Chance' },
    { key: 'arb',     label: '⚡ Match Arb' },
    { key: 'kelly',   label: '💰 Kelly Stake' },
    { key: 'ev',      label: '📊 Value / EV' },
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
              tab === t.key
                ? t.key === 'ou' ? 'bg-orange-500 text-white'
                  : t.key === 'dc' ? 'bg-indigo-500 text-white'
                  : 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ou'      && <OUCalc />}
      {tab === 'dc'      && <DCCalc />}
      {tab === 'arb'     && <ArbCalc />}
      {tab === 'kelly'   && <KellyCalc />}
      {tab === 'ev'      && <EVCalc />}
      {tab === 'convert' && <OddsConverter />}
    </div>
  )
}
