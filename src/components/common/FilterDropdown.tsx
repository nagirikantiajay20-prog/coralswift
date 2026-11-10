import { Select } from '@/components/ui/input'

export interface FilterOption<T extends string = string> {
  value: T
  label: string
}

/** Native select: full keyboard and screen-reader support, no extra dependency. */
export function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: FilterOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <Select
      aria-label={label}
      className="w-auto min-w-40"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  )
}
