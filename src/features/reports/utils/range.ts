export const PRESETS = ['today', '7d', '30d', '90d', 'this_month', 'prev_month', 'custom'] as const
export type Preset = (typeof PRESETS)[number]
export const PRESET_LABEL: Record<Preset, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  this_month: 'This month',
  prev_month: 'Previous month',
  custom: 'Custom range',
}

export interface ResolvedRange {
  /** ISO instants at LOCAL calendar-day boundaries (start 00:00:00.000, end 23:59:59.999). */
  from?: string
  to?: string
  error?: string
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
/** Strict local-date parse ("YYYY-MM-DD"); rejects rollovers like 2026-02-31. */
function parseDay(s: string): Date | undefined {
  const m = DAY.exec(s)
  if (!m) return undefined
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : undefined
}
const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, -1)
const span = (a: Date, b: Date): ResolvedRange => ({
  from: startOf(a).toISOString(),
  to: endOf(b).toISOString(),
})

export function resolveRange(
  preset: Preset,
  customFrom = '',
  customTo = '',
  now = new Date(),
): ResolvedRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  const ago = (n: number) => new Date(y, m, now.getDate() - n)
  switch (preset) {
    case 'today':
      return span(now, now)
    case '7d':
      return span(ago(6), now)
    case '30d':
      return span(ago(29), now)
    case '90d':
      return span(ago(89), now)
    case 'this_month':
      return span(new Date(y, m, 1), now)
    case 'prev_month':
      return span(new Date(y, m - 1, 1), new Date(y, m, 0))
    case 'custom': {
      const f = customFrom ? parseDay(customFrom) : undefined
      const t = customTo ? parseDay(customTo) : undefined
      if ((customFrom && !f) || (customTo && !t)) return { error: 'Enter valid dates.' }
      if (f && t && f > t) return { error: 'The start date must be on or before the end date.' }
      return { from: f && startOf(f).toISOString(), to: t && endOf(t).toISOString() }
    }
  }
}

/** True when `at` (ISO) lies inside the range; open ends are unbounded. */
export const inRange = (at: string, r: ResolvedRange) => {
  const t = Date.parse(at)
  return (
    !Number.isNaN(t) && (!r.from || t >= Date.parse(r.from)) && (!r.to || t <= Date.parse(r.to))
  )
}
