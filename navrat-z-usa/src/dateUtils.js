// Všechna data ukládáme jako řetězce 'YYYY-MM-DD' v lokálním čase,
// aby nevznikaly posuny kvůli časovým pásmům.

export const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]
export const WEEKDAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

const pad = (n) => String(n).padStart(2, '0')

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export const addDays = (date, n) => {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Pondělí jako první den týdne
export const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7
  return addDays(d, -day)
}

export const daysBetween = (fromDate, toDate) => {
  const a = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const b = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.round((b - a) / 86400000)
}

// 6 týdnů × 7 dní pro měsíční mřížku
export const monthGrid = (year, month) => {
  const start = startOfWeek(new Date(year, month, 1))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export const formatDate = (key, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  fromKey(key).toLocaleDateString('cs-CZ', opts)

export const formatDateShort = (key) =>
  fromKey(key).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })

// Správné skloňování: 1 den, 2–4 dny, 5+ dní
export const pluralDays = (n) => {
  const a = Math.abs(n)
  if (a === 1) return 'den'
  if (a >= 2 && a <= 4) return 'dny'
  return 'dní'
}
