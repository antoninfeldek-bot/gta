import { CATEGORIES } from '../data'

export default function CategoryChip({ category, className = '' }) {
  const c = CATEGORIES[category] ?? CATEGORIES.mesto
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${c.chip} ${className}`}
    >
      <span aria-hidden>{c.emoji}</span>
      {c.label}
    </span>
  )
}
