import { useMemo, useState } from 'react'
import ActivityItem from './ActivityItem'
import { CATEGORIES } from '../data'

const STATUS = [
  { id: 'all', label: 'Vše' },
  { id: 'open', label: 'Zbývá' },
  { id: 'done', label: 'Splněno' },
]

// Naplánované podle data, pak bez data, splněné vždy na konci
const sortActivities = (a, b) => {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.date && b.date) return a.date.localeCompare(b.date)
  if (a.date) return -1
  if (b.date) return 1
  return (a.createdAt ?? 0) - (b.createdAt ?? 0)
}

export default function ListView({ activities, onToggle, onEdit, onDelete }) {
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activities
      .filter((a) => (status === 'open' ? !a.done : status === 'done' ? a.done : true))
      .filter((a) => category === 'all' || a.category === category)
      .filter((a) => !q || a.title.toLowerCase().includes(q) || a.note?.toLowerCase().includes(q))
      .sort(sortActivities)
  }, [activities, status, category, query])

  const countFor = (cat) => activities.filter((a) => a.category === cat && !a.done).length

  return (
    <section>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat v aktivitách…"
            className="w-full rounded-xl border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {STATUS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                status === s.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FilterPill active={category === 'all'} onClick={() => setCategory('all')}>
          Všechny kategorie
        </FilterPill>
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <FilterPill key={key} active={category === key} onClick={() => setCategory(key)}>
            <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            {c.label}
            <span className="text-slate-400">{countFor(key)}</span>
          </FilterPill>
        ))}
      </div>

      {filtered.length ? (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {filtered.map((a) => (
            <ActivityItem key={a.id} activity={a} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 py-16 text-center">
          <p className="text-4xl">🗺️</p>
          <p className="mt-3 font-semibold text-slate-700">Nic tu není</p>
          <p className="mt-1 text-sm text-slate-500">Zkus změnit filtr nebo přidej novou aktivitu.</p>
        </div>
      )}
    </section>
  )
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
        active
          ? 'bg-slate-900 text-white ring-slate-900 [&_.text-slate-400]:text-slate-300'
          : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
