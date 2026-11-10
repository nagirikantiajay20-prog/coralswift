import { describe, expect, it } from 'vitest'
import type { ReviewDetail } from '@/features/partner-applications/types'
import { buildChecklist, checklistProgress, decisionsFrom } from './derive'

const base = {
  application: { id: '1', assigned_reviewer_id: null, submission_count: 1 },
  organization: { authorized_contacts: [], registration_number: 'X', client_references: null },
  documents: [
    {
      id: 'd',
      category: 'registration_proof',
      status: '',
      current_version: { review_status: 'accepted' },
    },
  ],
  eligibility_verifications: [{ submission_no: 1 }],
  status_history: [],
  open_information_requests: 2,
} as unknown as ReviewDetail

describe('review derivations', () => {
  it('derives completion from backend fields only', () => {
    const items = buildChecklist(base)
    const get = (l: string) => items.find((i) => i.label.startsWith(l))!.done
    expect(get('Reviewer assigned')).toBe(false)
    expect(get('Registration number')).toBe(true)
    expect(get('Registration proof')).toBe(true)
    expect(get('Operating history')).toBe(false)
    expect(get('Human eligibility')).toBe(true)
    expect(get('No open')).toBe(false)
    expect(checklistProgress(items).total).toBe(items.length)
  })
  it('lists decisions newest first', () => {
    const h = (to: string, at: string) => ({ to_status: to, created_at: at }) as never
    const r = decisionsFrom([
      h('rejected', '2026-01-01'),
      h('capability_review', '2026-01-02'),
      h('scale_up', '2026-01-03'),
    ])
    expect(r.map((x) => x.to_status)).toEqual(['scale_up', 'rejected'])
  })
})
