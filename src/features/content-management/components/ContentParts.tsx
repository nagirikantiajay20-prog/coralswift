import { Check, X } from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { ContentStatus } from '../types'
import { CAPABILITIES, STATUS_LABEL, STATUS_TONE } from '../utils/content'

export const ContentStatusBadge = ({ status }: { status: ContentStatus }) => (
  <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
)

export function CapabilityMatrix() {
  return (
    <ul className="divide-y divide-line text-sm">
      {CAPABILITIES.map((c) => (
        <li key={c.name} className="flex items-start gap-3 px-5 py-3">
          {c.supported ? (
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-label="Supported" />
          ) : (
            <X className="mt-0.5 size-4 shrink-0 text-rose" aria-label="Not supported" />
          )}
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted">{c.note}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
