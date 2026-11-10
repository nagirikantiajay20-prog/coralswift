import { isAxiosError } from 'axios'
import type { StatusTone } from '@/components/common/StatusBadge'
import { toAppError } from '@/services/api/errors'
import {
  DOC_CATEGORIES,
  REVIEW_STATUSES,
  type ApplicationDocument,
  type DocCategory,
  type ReviewStatus,
} from '@/features/partner-applications/types'
import type { DocRow, ReviewAction } from '../types'

const asStatus = (s: string | undefined): ReviewStatus | null =>
  (REVIEW_STATUSES as readonly string[]).includes(s ?? '') ? (s as ReviewStatus) : null

/** Backend document -> display row. Nothing is inferred: absent fields stay null. */
export function toDocRow(applicationId: string, d: ApplicationDocument): DocRow {
  const v = d.current_version
  return {
    id: d.id,
    applicationId,
    category: d.category,
    filename: v?.original_filename ?? null,
    contentType: v?.content_type ?? null,
    size: v?.file_size ?? null,
    versionNo: v?.version_no ?? null,
    uploadedAt: v?.uploaded_at ?? null,
    reviewStatus: asStatus(v?.review_status),
    reviewComment: v?.review_comment ?? null,
    uploadStatus: v?.upload_status ?? null,
    expiresOn: v?.expires_on ?? null,
  }
}

/**
 * Categories with no uploaded file. Same category source as the Phase 6 checklist (the backend's
 * PartnerDocCategory enum); no extra requirements are invented.
 */
export const missingCategories = (docs: ApplicationDocument[]): DocCategory[] =>
  DOC_CATEGORIES.filter((c) => !docs.some((d) => d.category === c && d.current_version))

/** Counts for ONE application (complete data, not a paginated sample). */
export function summarize(docs: ApplicationDocument[]) {
  const rows = docs.filter((d) => d.current_version).map((d) => toDocRow('', d))
  const n = (s: ReviewStatus) => rows.filter((r) => r.reviewStatus === s).length
  const latest =
    rows
      .map((r) => r.uploadedAt)
      .filter((x): x is string => !!x)
      .sort()
      .at(-1) ?? null
  return {
    total: rows.length,
    pending: n('pending'),
    accepted: n('accepted'),
    rejected: n('rejected'),
    replacementRequested: n('clarification_needed'),
    missing: missingCategories(docs).length,
    latestUpload: latest,
  }
}

export interface DocFilters {
  q: string
  category: DocCategory | 'all'
  status: ReviewStatus | 'all'
}

export const filterRows = (rows: DocRow[], f: DocFilters) =>
  rows.filter(
    (r) =>
      (f.category === 'all' || r.category === f.category) &&
      (f.status === 'all' || r.reviewStatus === f.status) &&
      (!f.q.trim() ||
        `${r.filename ?? ''} ${r.category}`.toLowerCase().includes(f.q.trim().toLowerCase())),
  )

export const STATUS_TONE: Record<ReviewStatus, StatusTone> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  clarification_needed: 'info',
}

/** `clarification_needed` is the only "ask for a better file" state the backend defines. */
export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  clarification_needed: 'Replacement requested',
}

const ACTION_STATUS: Record<ReviewAction, ReviewStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  request_replacement: 'clarification_needed',
}

export type ReviewBody = { status: ReviewStatus; comment?: string; version_no?: number }

/** Validates a review action; reject / replacement need a reason (visible to the partner). */
export function buildReviewPayload(
  action: ReviewAction,
  comment: string,
  versionNo: number | null,
): { ok: true; body: ReviewBody } | { ok: false; error: string } {
  const c = comment.trim()
  if (action !== 'accept' && !c) return { ok: false, error: 'A reason is required' }
  if (c.length > 4000) return { ok: false, error: 'Comment is too long (max 4000 characters)' }
  return {
    ok: true,
    body: {
      status: ACTION_STATUS[action],
      ...(c ? { comment: c } : {}),
      ...(versionNo ? { version_no: versionNo } : {}),
    },
  }
}

/** Browser-safe types only (no HTML/SVG, which could run script from the blob origin). */
const PREVIEWABLE = ['application/pdf', 'image/png', 'image/jpeg']
export const canPreview = (contentType: string | null) =>
  !!contentType && PREVIEWABLE.includes(contentType.toLowerCase())

export const formatSize = (n: number | null) =>
  n === null
    ? '—'
    : n < 1024
      ? `${n} B`
      : n < 1048576
        ? `${(n / 1024).toFixed(1)} KB`
        : `${(n / 1048576).toFixed(1)} MB`

/** Blob error bodies are unreadable as JSON, so map by status. */
export function accessErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    switch (e.response?.status) {
      case 401:
        return 'Your session has expired. Sign in again.'
      case 403:
        return 'You are not authorised to access this document.'
      case 404:
        return 'This document or version is no longer available. It may have been replaced.'
      case 409:
        return 'This document is not available yet (it may still be quarantined).'
    }
  }
  return toAppError(e).message
}

/** Tracks blob URLs so every one is revoked (on timeout, close or unmount). Never stored. */
export function createUrlTracker() {
  const urls = new Set<string>()
  return {
    create(blob: Blob) {
      const u = URL.createObjectURL(blob)
      urls.add(u)
      return u
    },
    revoke(u: string) {
      URL.revokeObjectURL(u)
      urls.delete(u)
    },
    revokeAll() {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    },
    get size() {
      return urls.size
    },
  }
}
