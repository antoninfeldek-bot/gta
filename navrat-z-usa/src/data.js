// Datum návratu z USA (sobota 5. června 2027)
export const RETURN_DATE = '2027-06-05'

export const CATEGORIES = {
  vylety: {
    label: 'Výlety',
    emoji: '🧭',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    event: 'bg-sky-100 text-sky-800 border-sky-400 hover:bg-sky-200',
  },
  jidlo: {
    label: 'Jídlo',
    emoji: '🍽️',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    event: 'bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-200',
  },
  rodina: {
    label: 'Rodina',
    emoji: '❤️',
    dot: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    event: 'bg-rose-100 text-rose-800 border-rose-400 hover:bg-rose-200',
  },
  kamaradi: {
    label: 'Kamarádi',
    emoji: '🍻',
    dot: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
    event: 'bg-violet-100 text-violet-800 border-violet-400 hover:bg-violet-200',
  },
  mesto: {
    label: 'Město',
    emoji: '🏙️',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    event: 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200',
  },
}

let counter = 0
const seed = (title, category, date = null, note = '') => ({
  id: `seed-${++counter}`,
  title,
  category,
  date,
  note,
  done: false,
  createdAt: Date.now() + counter,
})

export const INITIAL_ACTIVITIES = [
  seed('Vystřelit v oku', 'kamaradi', RETURN_DATE, 'Uvítací akce 🎉'),
  seed('Trip s kámoši do Německa', 'vylety', null, 'Na celý týden'),
  seed('Pozvat všechny kamarády na pivo', 'kamaradi'),
  seed('Jít se najíst k babičce', 'rodina'),
  seed('Jít do obchodu a koupit všechno jídlo, na který budu mít chuť', 'jidlo'),
  seed('Jít fotit do Prahy street', 'mesto'),
  seed('Jet na kole do centra', 'mesto'),
  seed('Chodit celou noc po Praze s kámošema', 'kamaradi'),
  seed('Jít s mamou a ségrou na oběd do Kantýny', 'rodina'),
  seed('Naučit nejmladší ségru na kole', 'rodina'),
  seed('Jet na chatu s kamarádama', 'kamaradi'),
  seed('Jet za dědou do Bratislavy', 'vylety'),
]
