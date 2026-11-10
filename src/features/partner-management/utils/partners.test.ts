import { describe, expect, it } from 'vitest'
import { statusChangeSchema } from '../schemas'
import type { OrgRow } from '../types'
import {
  countriesOf,
  lifecycle,
  metaTotal,
  refine,
  sortRows,
  statusAction,
  toPartnerDetail,
} from './partners'

const row = (o: Partial<OrgRow>): OrgRow => ({
  id: 'i',
  legal_name: 'B',
  status: 'active',
  country: 'IN',
  created_at: '2026-02-01T00:00:00Z',
  open_application_status: null,
  ...o,
})

describe('partner utils', () => {
  it('metaTotal never infers a total', () => {
    expect(metaTotal({ total: 7 })).toBe(7)
    expect(metaTotal({})).toBeUndefined()
    expect(metaTotal(null)).toBeUndefined()
  })
  it('only active<->suspended transitions exist', () => {
    expect(statusAction('active')?.to).toBe('suspended')
    expect(statusAction('suspended')?.to).toBe('active')
    expect(statusAction('pilot_onboarding')).toBeNull()
  })
  it('keeps onboarding distinct from account activation', () => {
    const l = lifecycle({ status: 'active', open_application_status: 'pilot_onboarding' })
    expect(l.inOnboarding).toBe(true)
    expect(l.accountState).toBe('not exposed by backend')
    expect(lifecycle({ status: 'active', open_application_status: 'submitted' }).inOnboarding).toBe(
      false,
    )
  })
  it('refines, sorts and lists countries', () => {
    const rows = [
      row({ id: '1', legal_name: 'Z' }),
      row({ id: '2', legal_name: 'A', country: 'US', created_at: '2026-03-01T00:00:00Z' }),
    ]
    expect(refine(rows, { country: 'US', from: '', to: '' }).map((r) => r.id)).toEqual(['2'])
    expect(refine(rows, { country: '', from: '2026-02-15', to: '' }).map((r) => r.id)).toEqual([
      '2',
    ])
    expect(sortRows(rows, 'name')[0].id).toBe('2')
    expect(sortRows(rows, 'oldest')[0].id).toBe('1')
    expect(countriesOf(rows)).toEqual(['IN', 'US'])
  })
  it('reads the untyped detail dict defensively', () => {
    expect(toPartnerDetail(null)).toBeNull()
    expect(toPartnerDetail({ foo: 1 })).toBeNull()
    const d = toPartnerDetail({
      id: 'o1',
      legal_name: 'Acme',
      applications: [{ id: 'a1', status: 'submitted' }, { nope: 1 }],
    })
    expect(d?.org.legal_name).toBe('Acme')
    expect(d?.applications).toHaveLength(1)
    expect(toPartnerDetail({ organization: { id: 'o2' } })?.org.id).toBe('o2')
  })
  it('validates the status reason like OrgStatusIn', () => {
    expect(statusChangeSchema.safeParse({ reason: '  ' }).success).toBe(false)
    expect(statusChangeSchema.safeParse({ reason: 'x'.repeat(4001) }).success).toBe(false)
    expect(statusChangeSchema.safeParse({ reason: 'ok' }).success).toBe(true)
  })
})
