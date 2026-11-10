import { describe, expect, it } from 'vitest'
import { humanize, pageCount } from './format'

describe('application utils', () => {
  it('humanizes statuses', () => expect(humanize('capability_review')).toBe('Capability review'))
  it('uses meta.total when present', () => expect(pageCount({ total: 45 }, 1, 20, 20)).toBe(3))
  it('infers a next page from a full page when meta is empty', () => {
    expect(pageCount(null, 2, 20, 20)).toBe(3)
    expect(pageCount(null, 2, 20, 5)).toBe(2)
  })
})
