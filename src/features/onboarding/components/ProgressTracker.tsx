import { Check } from 'lucide-react'
import type { PortalStatus } from '@/features/partner-applications/types'
import { humanize } from '@/features/partner-applications/utils/format'
import { PIPELINE } from '../types'

/** Stage tracker over the backend's PortalStatus pipeline. Off-pipeline statuses get a note. */
export function ProgressTracker({ status }: { status: PortalStatus }) {
  const at = PIPELINE.indexOf(status)
  return (
    <div>
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Application stages">
        {PIPELINE.map((s, i) => {
          const done = at >= 0 && i < at
          const current = i === at
          return (
            <li
              key={s}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-md border p-2 text-xs ${
                current
                  ? 'border-coral-ink bg-warm font-semibold'
                  : done
                    ? 'border-line bg-surface'
                    : 'border-line text-muted'
              }`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${
                  done ? 'bg-coral-ink text-white' : 'border border-line'
                }`}
              >
                {done ? <Check className="size-3" aria-label="Completed" /> : i + 1}
              </span>
              {humanize(s)}
            </li>
          )
        })}
      </ol>
      {at < 0 && (
        <p className="mt-2 text-sm text-muted">
          Current status “{humanize(status)}” is outside the evaluation pipeline.
        </p>
      )}
    </div>
  )
}
