import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, RETURN_DATE } from '../data'

export default function ActivityModal({ activity, presetDate, onSave, onDelete, onClose }) {
  const isEdit = Boolean(activity)
  const [title, setTitle] = useState(activity?.title ?? '')
  const [date, setDate] = useState(activity?.date ?? presetDate ?? '')
  const [category, setCategory] = useState(activity?.category ?? 'vylety')
  const [note, setNote] = useState(activity?.note ?? '')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Zadej prosím název aktivity.')
      inputRef.current?.focus()
      return
    }
    onSave({
      ...(isEdit ? { id: activity.id } : {}),
      title: title.trim(),
      date: date || null,
      category,
      note: note.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl animate-pop-in sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <h2 id="modal-title" className="text-xl font-bold text-slate-900">
            {isEdit ? 'Upravit aktivitu' : 'Nová aktivita'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Zavřít"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <Field label="Název úkolu / výletu">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError('')
              }}
              placeholder="Např. Jet na Sněžku"
              className={`input ${error ? 'ring-rose-400' : ''}`}
            />
            {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
          </Field>

          <Field label="Kategorie">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(CATEGORIES).map(([key, c]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset transition ${
                    category === key
                      ? `${c.chip} ring-2`
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Datum" hint="nepovinné">
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                min="2027-01-01"
                onChange={(e) => setDate(e.target.value)}
                className="input flex-1"
              />
              {date ? (
                <button
                  type="button"
                  onClick={() => setDate('')}
                  className="rounded-xl px-3 text-sm font-medium text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                >
                  Bez data
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDate(RETURN_DATE)}
                  className="whitespace-nowrap rounded-xl px-3 text-sm font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                >
                  Den návratu
                </button>
              )}
            </div>
          </Field>

          <Field label="Poznámka" hint="nepovinné">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="S kým, kde, co nezapomenout…"
              className="input resize-none"
            />
          </Field>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {isEdit && (
            <button
              type="button"
              onClick={() => window.confirm('Opravdu smazat tuto aktivitu?') && onDelete(activity.id)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 sm:mr-auto"
            >
              Smazat
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:ml-auto"
          >
            Zrušit
          </button>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            {isEdit ? 'Uložit změny' : 'Přidat aktivitu'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="block">
      <span className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold text-slate-700">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </div>
  )
}
