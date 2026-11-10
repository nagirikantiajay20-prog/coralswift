import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { canAccess } from '@/config/permissions'
import type { ApplicationDocument } from '@/features/partner-applications/types'
import {
  accessErrorMessage,
  buildReviewPayload,
  canPreview,
  createUrlTracker,
  filterRows,
  missingCategories,
  summarize,
  toDocRow,
} from './documents'

const doc = (id: string, category: string, review?: string, at = '2026-01-02T00:00:00Z') =>
  ({
    id,
    category,
    status: 'active',
    current_version: review
      ? {
          version_no: 2,
          original_filename: `${id}.pdf`,
          content_type: 'application/pdf',
          file_size: 2048,
          upload_status: 'clean',
          expires_on: null,
          review_status: review,
          review_comment: null,
          uploaded_at: at,
        }
      : null,
  }) as unknown as ApplicationDocument

const docs = [
  doc('a', 'registration_proof', 'accepted'),
  doc('b', 'financial_statements', 'pending', '2026-03-01T00:00:00Z'),
  doc('c', 'client_references', 'rejected'),
  doc('d', 'service_portfolio', 'clarification_needed'),
  doc('e', 'operating_history'),
]

describe('document transformation', () => {
  it('maps backend fields to a row and links it to its application', () => {
    const r = toDocRow('app1', docs[0])
    expect(r).toMatchObject({
      applicationId: 'app1',
      filename: 'a.pdf',
      versionNo: 2,
      reviewStatus: 'accepted',
    })
    expect(toDocRow('app1', docs[4])).toMatchObject({ filename: null, reviewStatus: null })
  })
  it('ignores unknown review statuses instead of inventing one', () => {
    expect(toDocRow('x', doc('z', 'registration_proof', 'weird')).reviewStatus).toBeNull()
  })
  it('summarises one application and finds missing categories', () => {
    expect(summarize(docs)).toMatchObject({
      total: 4,
      pending: 1,
      accepted: 1,
      rejected: 1,
      replacementRequested: 1,
      missing: 4,
      latestUpload: '2026-03-01T00:00:00Z',
    })
    expect(missingCategories(docs)).toContain('operating_history')
    expect(missingCategories(docs)).not.toContain('registration_proof')
  })
  it('filters by category, status and text', () => {
    const rows = docs.filter((d) => d.current_version).map((d) => toDocRow('a', d))
    expect(filterRows(rows, { q: '', category: 'all', status: 'pending' })).toHaveLength(1)
    expect(filterRows(rows, { q: 'c.pdf', category: 'all', status: 'all' })).toHaveLength(1)
    expect(
      filterRows(rows, { q: '', category: 'service_portfolio', status: 'accepted' }),
    ).toHaveLength(0)
  })
})

describe('review action validation', () => {
  it('accept needs no reason; reject and replacement do', () => {
    expect(buildReviewPayload('accept', '', 2)).toEqual({
      ok: true,
      body: { status: 'accepted', version_no: 2 },
    })
    expect(buildReviewPayload('reject', '  ', 2).ok).toBe(false)
    expect(buildReviewPayload('request_replacement', '', null).ok).toBe(false)
    expect(buildReviewPayload('request_replacement', 'Blurry scan', null)).toEqual({
      ok: true,
      body: { status: 'clarification_needed', comment: 'Blurry scan' },
    })
    expect(buildReviewPayload('reject', 'x'.repeat(4001), 1).ok).toBe(false)
  })
})

describe('secure access', () => {
  const err = (status: number) =>
    new AxiosError('x', 'E', undefined, undefined, { status } as never)
  it('maps download failures to useful messages', () => {
    expect(accessErrorMessage(err(403))).toMatch(/not authorised/)
    expect(accessErrorMessage(err(404))).toMatch(/no longer available/)
    expect(accessErrorMessage(err(401))).toMatch(/session/)
  })
  it('previews only browser-safe types', () => {
    expect(canPreview('application/pdf')).toBe(true)
    expect(canPreview('image/svg+xml')).toBe(false)
    expect(canPreview('text/html')).toBe(false)
    expect(canPreview(null)).toBe(false)
  })
  it('revokes every temporary object URL', () => {
    const create = vi.fn().mockReturnValueOnce('blob:1').mockReturnValueOnce('blob:2')
    const revoke = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
    const t = createUrlTracker()
    t.create(new Blob(['a']))
    t.create(new Blob(['b']))
    t.revoke('blob:1')
    expect(t.size).toBe(1)
    t.revokeAll()
    expect(revoke).toHaveBeenCalledWith('blob:2')
    expect(t.size).toBe(0)
    vi.unstubAllGlobals()
  })
})

describe('module access boundary', () => {
  it('only reviewers and super administrators reach documents', () => {
    expect(canAccess('partner_reviewer', 'documents')).toBe(true)
    expect(canAccess('super_administrator', 'documents')).toBe(true)
    expect(canAccess('business_development_manager', 'documents')).toBe(false)
    expect(canAccess('content_administrator', 'documents')).toBe(false)
  })
})
