import { useEffect, useState } from 'react'
import { RETURN_DATE } from '../data'
import { daysBetween, fromKey, pluralDays } from '../dateUtils'

export default function Countdown({ activities }) {
  const [now, setNow] = useState(() => new Date())

  // Přepočet každou minutu, aby se odpočet změnil o půlnoci
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const target = fromKey(RETURN_DATE)
  const days = daysBetween(now, target)
  const done = activities.filter((a) => a.done).length
  const total = activities.length
  const pct = total ? Math.round((done / total) * 100) : 0

  let headline
  if (days > 0) headline = { big: days, small: `${pluralDays(days)} do návratu domů` }
  else if (days === 0) headline = { big: 'Dnes', small: 'se vracíš domů! 🎉' }
  else headline = { big: Math.abs(days), small: `${pluralDays(days)} zpátky doma 🏡` }

  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 p-6 text-white shadow-xl shadow-indigo-200 sm:p-10">
      <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-sky-300/20 blur-2xl" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-indigo-100">
            🇺🇸 ✈️ 🇨🇿 &nbsp;Návrat z USA
          </p>
          <h1 className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-6xl font-extrabold tabular-nums tracking-tight sm:text-7xl">
              {headline.big}
            </span>
            <span className="text-xl font-semibold text-indigo-50 sm:text-2xl">{headline.small}</span>
          </h1>
          <p className="mt-2 text-indigo-100">Sobota 5. června 2027</p>
        </div>

        <div className="w-full rounded-2xl bg-white/15 p-4 backdrop-blur sm:w-64">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-indigo-50">Splněno</span>
            <span className="font-bold tabular-nums">
              {done} / {total}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-indigo-100">
            {pct === 100 && total > 0 ? 'Všechno splněno, legendo! 🏆' : `${pct} % plánů za tebou`}
          </p>
        </div>
      </div>
    </header>
  )
}
