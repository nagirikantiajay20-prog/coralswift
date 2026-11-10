import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchInput({
  value,
  onChange,
  label = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" aria-hidden />
      <Input
        type="search"
        aria-label={label}
        placeholder={`${label}…`}
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
