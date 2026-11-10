import { describe, expect, it } from 'vitest'
import { meetingConfirmSchema } from './index'

const ok = { start: '2026-12-01T10:00', end: '2026-12-01T11:00', calendar_checked: true, note: '' }
describe('meetingConfirmSchema', () => {
  it('accepts a checked, ordered slot', () =>
    expect(meetingConfirmSchema.safeParse(ok).success).toBe(true))
  it('requires the calendar attestation', () =>
    expect(meetingConfirmSchema.safeParse({ ...ok, calendar_checked: false }).success).toBe(false))
  it('rejects end before start', () =>
    expect(meetingConfirmSchema.safeParse({ ...ok, end: '2026-12-01T09:00' }).success).toBe(false))
})
