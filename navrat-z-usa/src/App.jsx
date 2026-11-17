import { useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { INITIAL_ACTIVITIES } from './data'
import Countdown from './components/Countdown'
import ListView from './components/ListView'
import CalendarView from './components/CalendarView'
import ActivityModal from './components/ActivityModal'

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export default function App() {
  const [activities, setActivities] = useLocalStorage('navrat-aktivity-v1', INITIAL_ACTIVITIES)
  const [view, setView] = useLocalStorage('navrat-pohled-v1', 'list')
  // modal: null | { activity?: object, presetDate?: string }
  const [modal, setModal] = useState(null)

  const openNew = (presetDate = null) => setModal({ presetDate })
  const openEdit = (activity) => setModal({ activity })

  const saveActivity = (data) => {
    if (data.id) {
      setActivities((list) => list.map((a) => (a.id === data.id ? { ...a, ...data } : a)))
    } else {
      setActivities((list) => [...list, { ...data, id: newId(), done: false, createdAt: Date.now() }])
    }
    setModal(null)
  }

  const toggleDone = (id) =>
    setActivities((list) => list.map((a) => (a.id === id ? { ...a, done: !a.done } : a)))

  const deleteActivity = (id) => {
    setActivities((list) => list.filter((a) => a.id !== id))
    setModal(null)
  }

  const moveActivity = (id, date) =>
    setActivities((list) => list.map((a) => (a.id === id ? { ...a, date } : a)))

  const resetData = () => {
    if (window.confirm('Opravdu obnovit výchozí seznam? Tvoje změny se ztratí.')) {
      setActivities(INITIAL_ACTIVITIES)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Countdown activities={activities} />

        {/* Ovládací lišta */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200" role="tablist">
            {[
              { id: 'list', label: 'Seznam', icon: '☑️' },
              { id: 'calendar', label: 'Kalendář', icon: '📅' },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={view === t.id}
                onClick={() => setView(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  view === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span aria-hidden>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => openNew()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="text-lg leading-none">+</span> Přidat novou aktivitu
          </button>
        </div>

        <main className="mt-6">
          {view === 'list' ? (
            <ListView
              activities={activities}
              onToggle={toggleDone}
              onEdit={openEdit}
              onDelete={deleteActivity}
            />
          ) : (
            <CalendarView
              activities={activities}
              onAddOnDate={openNew}
              onEdit={openEdit}
              onMove={moveActivity}
              onToggle={toggleDone}
            />
          )}
        </main>

        <footer className="mt-12 flex flex-col items-center gap-2 text-center text-xs text-slate-400">
          <p>Data se ukládají jen v tomto prohlížeči (localStorage).</p>
          <button onClick={resetData} className="underline decoration-dotted hover:text-slate-600">
            Obnovit výchozí seznam
          </button>
        </footer>
      </div>

      {modal && (
        <ActivityModal
          activity={modal.activity}
          presetDate={modal.presetDate}
          onSave={saveActivity}
          onDelete={deleteActivity}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
