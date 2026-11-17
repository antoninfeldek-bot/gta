import { useMemo, useState } from 'react'
import { CATEGORIES, RETURN_DATE } from '../data'
import {
  MONTHS,
  WEEKDAYS_SHORT,
  addDays,
  fromKey,
  monthGrid,
  startOfWeek,
  toKey,
  todayKey,
} from '../dateUtils'
import CategoryChip from './CategoryChip'

const DRAG_TYPE = 'text/x-activity-id'

// Kalendář startuje na měsíci návratu (pokud už není později)
const initialAnchor = () => {
  const ret = fromKey(RETURN_DATE)
  const now = new Date()
  return now > ret ? now : ret
}

export default function CalendarView({ activities, onAddOnDate, onEdit, onMove, onToggle }) {
  const [mode, setMode] = useState('month') // 'month' | 'week'
  const [anchor, setAnchor] = useState(initialAnchor)
  const [dragOver, setDragOver] = useState(null)

  const byDate = useMemo(() => {
    const map = {}
    for (const a of activities) {
      if (!a.date) continue
      ;(map[a.date] ??= []).push(a)
    }
    for (const k in map) map[k].sort((a, b) => Number(a.done) - Number(b.done))
    return map
  }, [activities])

  const unscheduled = activities.filter((a) => !a.date)

  const days =
    mode === 'month'
      ? monthGrid(anchor.getFullYear(), anchor.getMonth())
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))

  const title =
    mode === 'month'
      ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : weekTitle(days[0], days[6])

  const step = (dir) => {
    const d = new Date(anchor)
    if (mode === 'month') {
      d.setDate(1)
      d.setMonth(d.getMonth() + dir)
    } else d.setDate(d.getDate() + dir * 7)
    setAnchor(d)
  }

  // ---- Drag & drop ----
  const dragProps = (activity) => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(DRAG_TYPE, activity.id)
      e.dataTransfer.setData('text/plain', activity.id)
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => setDragOver(null),
  })

  const dropProps = (targetKey) => ({
    onDragOver: (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragOver !== targetKey) setDragOver(targetKey)
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
    },
    onDrop: (e) => {
      e.preventDefault()
      const id = e.dataTransfer.getData(DRAG_TYPE) || e.dataTransfer.getData('text/plain')
      if (id) onMove(id, targetKey === 'none' ? null : targetKey)
      setDragOver(null)
    },
  })

  const today = todayKey()
  const currentMonth = anchor.getMonth()

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Hlavička kalendáře */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => step(-1)} label="Předchozí">‹</NavBtn>
            <NavBtn onClick={() => step(1)} label="Další">›</NavBtn>
          </div>
          <h2 className="min-w-[10rem] text-lg font-bold text-slate-900">{title}</h2>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAnchor(fromKey(RETURN_DATE))}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
            >
              ✈️ Návrat
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            >
              Dnes
            </button>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {[
                ['month', 'Měsíc'],
                ['week', 'Týden'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    mode === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dny v týdnu */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                i >= 5 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Mřížka */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const key = toKey(d)
            const items = byDate[key] ?? []
            const outside = mode === 'month' && d.getMonth() !== currentMonth
            const isToday = key === today
            const isReturn = key === RETURN_DATE
            const isOver = dragOver === key
            const maxShown = mode === 'month' ? 3 : 50

            return (
              <div
                key={key}
                {...dropProps(key)}
                onClick={() => onAddOnDate(key)}
                className={`group relative cursor-pointer border-slate-100 p-1 transition sm:p-1.5 ${
                  i % 7 !== 6 ? 'border-r' : ''
                } ${i < days.length - 7 ? 'border-b' : ''} ${
                  mode === 'month' ? 'min-h-[84px] sm:min-h-[112px]' : 'min-h-[320px]'
                } ${outside ? 'bg-slate-50/60' : 'bg-white'} ${
                  isReturn ? 'bg-gradient-to-br from-indigo-50 to-sky-50' : ''
                } ${isOver ? '!bg-indigo-100/70 ring-2 ring-inset ring-indigo-400' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : isReturn
                          ? 'bg-sky-500 text-white'
                          : outside
                            ? 'text-slate-300'
                            : 'text-slate-600'
                    }`}
                  >
                    {mode === 'week' ? `${d.getDate()}. ${d.getMonth() + 1}.` : d.getDate()}
                  </span>
                  <span className="hidden text-sm font-bold text-indigo-400 opacity-0 transition group-hover:opacity-100 sm:block">
                    +
                  </span>
                </div>
                {isReturn && (
                  <p className="mt-0.5 truncate px-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-600">
                    ✈️ Návrat
                  </p>
                )}

                <div className="mt-1 space-y-1">
                  {items.slice(0, maxShown).map((a) => (
                    <EventPill
                      key={a.id}
                      activity={a}
                      compact={mode === 'month'}
                      dragProps={dragProps(a)}
                      onEdit={onEdit}
                      onToggle={onToggle}
                    />
                  ))}
                  {items.length > maxShown && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAnchor(d)
                        setMode('week')
                      }}
                      className="w-full rounded px-1 text-left text-[11px] font-semibold text-slate-500 hover:text-indigo-600"
                    >
                      +{items.length - maxShown} další
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Postranní panel: aktivity bez data */}
      <aside
        {...dropProps('none')}
        className={`h-fit rounded-2xl border bg-white p-4 shadow-sm transition lg:sticky lg:top-4 ${
          dragOver === 'none' ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300' : 'border-slate-200'
        }`}
      >
        <h3 className="font-bold text-slate-900">Zatím bez data</h3>
        <p className="mt-1 text-xs text-slate-500">
          Přetáhni aktivitu na den v kalendáři. Sem ji přetáhni zpět, pokud chceš datum odebrat.
        </p>
        <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {unscheduled.length === 0 && (
            <li className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
              Všechno je naplánované 🎯
            </li>
          )}
          {unscheduled.map((a) => (
            <li
              key={a.id}
              {...dragProps(a)}
              onClick={() => onEdit(a)}
              className={`cursor-grab rounded-xl border border-slate-200 bg-white p-2.5 text-sm shadow-sm transition hover:border-indigo-300 hover:shadow active:cursor-grabbing ${
                a.done ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORIES[a.category]?.dot}`} />
                <span className={`font-medium leading-snug ${a.done ? 'line-through' : ''}`}>{a.title}</span>
              </div>
              <CategoryChip category={a.category} className="ml-4 mt-1.5" />
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Legenda</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(CATEGORIES).map((k) => (
              <CategoryChip key={k} category={k} />
            ))}
          </div>
        </div>
      </aside>
    </section>
  )
}

function EventPill({ activity, compact, dragProps, onEdit, onToggle }) {
  const c = CATEGORIES[activity.category] ?? CATEGORIES.mesto
  return (
    <div
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation()
        onEdit(activity)
      }}
      title={activity.title}
      className={`flex cursor-grab items-center gap-1 rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] font-medium leading-tight transition active:cursor-grabbing ${c.event} ${
        activity.done ? 'opacity-50 line-through' : ''
      } ${compact ? '' : 'py-1.5 text-xs'}`}
    >
      <input
        type="checkbox"
        checked={activity.done}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggle(activity.id)}
        className={`h-3 w-3 shrink-0 cursor-pointer accent-current ${compact ? 'hidden sm:block' : ''}`}
        aria-label="Splněno"
      />
      <span className={compact ? 'truncate' : 'line-clamp-3'}>{activity.title}</span>
    </div>
  )
}

function NavBtn({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </button>
  )
}

function weekTitle(start, end) {
  const s = `${start.getDate()}. ${start.getMonth() + 1}.`
  const e = `${end.getDate()}. ${end.getMonth() + 1}. ${end.getFullYear()}`
  return `${s} – ${e}`
}
