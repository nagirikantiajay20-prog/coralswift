import { describe, expect, it } from 'vitest'
import type { ApplicationDocument } from '@/features/partner-applications/types'
import { contactPrefill, provisioningBlockers, summarizeDocs } from './derive'

const doc = (review_status?: string): ApplicationDocument => ({
  id: 'x',
  category: 'registration_proof',
  status: 'active',
  current_version: review_status
    ? ({ review_status, version_no: 1 } as ApplicationDocument['current_version'])
    : null,
})

describe('onboarding derive', () => {
  it('summarizes document verification', () => {
    expect(summarizeDocs([doc('accepted'), doc('pending'), doc('rejected'), doc()])).toEqual({
      total: 4,
      verified: 1,
      awaiting: 1,
      needsAction: 2,
    })
  })
  it('blocks provisioning until onboarding stage and all docs verified', () => {
    expect(provisioningBlockers('capability_review', [doc('accepted')])).toHaveLength(1)
    expect(provisioningBlockers('pilot_onboarding', [])).toHaveLength(1)
    expect(
      provisioningBlockers('pilot_onboarding', [doc('accepted'), doc('pending')]),
    ).toHaveLength(1)
    expect(provisioningBlockers('scale_up', [doc('accepted')])).toEqual([])
  })
  it('prefills only string contact fields', () => {
    expect(contactPrefill([{ name: 'A B', email: 1 }])).toEqual({ full_name: 'A B', email: '' })
    expect(contactPrefill(null)).toEqual({ full_name: '', email: '' })
  })
})
