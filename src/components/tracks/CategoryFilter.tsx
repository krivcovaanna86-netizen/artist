import { type Category } from '../../lib/api/client'

interface CategoryFilterProps {
  categories: Category[]
  selected: string | null
  onSelect: (slug: string | null) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selected === null
            ? 'bg-tg-button text-tg-button-text'
            : 'bg-tg-secondary-bg text-tg-text hover:bg-tg-hint/20'
        }`}
      >
        Все
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.slug)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected === category.slug
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-tg-secondary-bg text-tg-text hover:bg-tg-hint/20'
          }`}
        >
          {category.icon && <span className="mr-1">{category.icon}</span>}
          {category.name}
          {category.trackCount !== undefined && (
            <span className="ml-1 opacity-60">({category.trackCount})</span>
          )}
        </button>
      ))}
    </div>
  )
}
