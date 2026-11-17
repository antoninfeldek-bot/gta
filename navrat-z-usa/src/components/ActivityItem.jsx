import { useState } from 'react'
import CategoryChip from './CategoryChip'
import { formatDateShort } from '../dateUtils'

export default function ActivityItem({ activity, onToggle, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const { title, done, date, note, category } = activity

  return (
    <li
      className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        done ? 'border-slate-100 bg-slate-50/60' : 'border-slate-200'
      }`}
    >
      <button
        onClick={() => onToggle(activity.id)}
        aria-label={done ? 'Označit jako nesplněné' : 'Označit jako splněné'}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50'
        }`}
      >
        {done && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`font-medium leading-snug ${
            done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
          }`}
        >
          {title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <CategoryChip category={category} />
          {date ? (
            <span className="inline-flex items-center gap-1">📅 {formatDateShort(date)}</span>
          ) : (
            <span className="italic text-slate-400">bez data</span>
          )}
        </div>
        {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {confirming ? (
          <>
            <button
              onClick={() => onDelete(activity.id)}
              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Smazat
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Zrušit
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(activity)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              aria-label="Upravit"
              title="Upravit"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M13.6 3.6a2 2 0 012.8 2.8l-.8.8-2.8-2.8.8-.8zM11.4 5.8L3 14.2V17h2.8l8.4-8.4-2.8-2.8z" />
              </svg>
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Smazat"
              title="Smazat"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M8 2a1 1 0 00-1 1v1H4a1 1 0 000 2h12a1 1 0 100-2h-3V3a1 1 0 00-1-1H8zM5 8h10l-.7 8.1A2 2 0 0112.3 18H7.7a2 2 0 01-2-1.9L5 8z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </li>
  )
}
