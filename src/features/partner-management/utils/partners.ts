import type { StatusTone } from '@/components/common/StatusBadge'
import type { OrgRow, OrgStatus, PartnerDetail } from '../types'

export const STATUS_TONE: Record<string, StatusTone> = { active: 'success', suspended: 'danger' }

/** Total from list `meta` if the backend sends one; undefined (shown as "—") otherwise. Never inferred from a page. */
export function metaTotal(meta: Record<string, unknown> | null | undefined): number | undefined {
  const v = meta?.total ?? meta?.total_count
  return typeof v === 'number' ? v : undefined
}

/** Only the two documented transitions exist; anything else offers no action. */
export function statusAction(status: string): { to: OrgStatus; label: string } | null {
  if (status === 'active') return { to: 'suspended', label: 'Suspend partner' }
  if (status === 'suspended') return { to: 'active', label: 'Reactivate partner' }
  return null
}

const ONBOARDING = ['pilot_onboarding', 'scale_up']

/**
 * Lifecycle facts the backend actually exposes on an organization: its partnership status and the
 * stage of its open application. Onboarding is NOT account activation; the organization endpoints
 * expose no account provisioning/activation state, so none is ever shown as known.
 */
export function lifecycle(row: Pick<OrgRow, 'status' | 'open_application_status'>) {
  const app = row.open_application_status
  return {
    partnership: row.status,
    application: app,
    inOnboarding: !!app && ONBOARDING.includes(app),
    accountState: 'not exposed by backend' as const,
  }
}

export interface RowFilters {
  country: string
  from: string
  to: string
}

/** Client-side refinement of the loaded page only (the API filters just q and status). */
export function refine(rows: OrgRow[], f: RowFilters): OrgRow[] {
  return rows.filter(
    (r) =>
      (!f.country || r.country === f.country) &&
      (!f.from || r.created_at.slice(0, 10) >= f.from) &&
      (!f.to || r.created_at.slice(0, 10) <= f.to),
  )
}

export type Sort = 'newest' | 'oldest' | 'name'
export function sortRows(rows: OrgRow[], sort: Sort): OrgRow[] {
  const out = [...rows]
  if (sort === 'name') return out.sort((a, b) => a.legal_name.localeCompare(b.legal_name))
  return out.sort((a, b) =>
    sort === 'newest'
      ? b.created_at.localeCompare(a.created_at)
      : a.created_at.localeCompare(b.created_at),
  )
}

export const countriesOf = (rows: OrgRow[]) =>
  [...new Set(rows.map((r) => r.country).filter((c): c is string => !!c))].sort()

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

/** Tolerant reader for the untyped detail dict: profile at the root or under `organization`; `applications` if present. */
export function toPartnerDetail(raw: Record<string, unknown> | null): PartnerDetail | null {
  if (!raw) return null
  const org = isObj(raw.organization) ? raw.organization : raw
  if (!str(org.id)) return null
  const applications = (Array.isArray(raw.applications) ? raw.applications : [])
    .filter(isObj)
    .flatMap((a) =>
      str(a.id)
        ? [
            {
              id: a.id as string,
              reference: str(a.reference),
              status: str(a.status),
              pathway: str(a.pathway),
              submitted_at: str(a.submitted_at) ?? null,
            },
          ]
        : [],
    )
  return { org: org as PartnerDetail['org'], applications }
}
