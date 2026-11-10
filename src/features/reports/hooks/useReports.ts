import { useQuery } from '@tanstack/react-query'
import { ENQUIRY_STATUSES } from '@/features/business-enquiries/types'
import { STATUS_LABEL } from '@/features/dashboard/utils/transform'
import { PORTAL_STATUSES } from '@/features/partner-applications/types'
import { DELIVERY_STATUSES } from '@/features/communication/types'
import { STATUS_LABEL as DELIVERY_LABEL } from '@/features/communication/utils/communication'
import { humanize } from '@/features/partner-applications/utils/format'
import {
  enquiryCount,
  enquiryRows,
  reportsService as svc,
  settleMetrics,
} from '../services/reportsService'
import type { EnquiryScope } from '../types'

const R = 'reports'
/** Scope identity for query keys: type list, status filter and the exact range sent to the backend. */
const sk = (s: EnquiryScope) => [
  s.types.join(','),
  s.status ?? '',
  s.range.from ?? '',
  s.range.to ?? '',
]

export const useApplicationCounts = (enabled: boolean) =>
  useQuery({
    queryKey: [R, 'apps'],
    enabled,
    queryFn: () =>
      settleMetrics([
        [
          'total',
          'Total applications',
          async () => {
            const parts = await Promise.all(PORTAL_STATUSES.map((s) => svc.applicationCount(s)))
            return parts.reduce((a, b) => a + b, 0)
          },
        ],
        ...PORTAL_STATUSES.map((s): [string, string, () => Promise<number>] => [
          s,
          STATUS_LABEL[s],
          () => svc.applicationCount(s),
        ]),
        ['unassigned', 'Unassigned (all statuses)', () => svc.applicationCount(undefined, true)],
      ]),
  })

export const useApplicationRows = (enabled: boolean) =>
  useQuery({ queryKey: [R, 'app-rows'], enabled, queryFn: svc.applicationRows })

export const useEnquiryMetrics = (s: EnquiryScope, enabled: boolean) =>
  useQuery({
    queryKey: [R, 'enq', ...sk(s)],
    enabled,
    queryFn: () => {
      const statuses = s.status ? [s.status] : ENQUIRY_STATUSES
      return settleMetrics([
        ['total', 'Total', () => enquiryCount(s)],
        ...statuses.map((st): [string, string, () => Promise<number>] => [
          `status:${st}`,
          humanize(st),
          () => enquiryCount({ ...s, status: st }),
        ]),
        ...(s.types.length > 1
          ? s.types.map((t): [string, string, () => Promise<number>] => [
              `type:${t}`,
              humanize(t),
              () => enquiryCount({ ...s, types: [t] }),
            ])
          : []),
        ['overdue', 'Overdue follow-ups', () => enquiryCount(s, { overdue: true })],
        ['unassigned', 'Unassigned', () => enquiryCount(s, { unassigned: true })],
        ['sla', 'SLA breached', () => enquiryCount(s, { sla_breached: true })],
      ])
    },
  })

export const useEnquiryRows = (s: EnquiryScope, enabled: boolean) =>
  useQuery({ queryKey: [R, 'enq-rows', ...sk(s)], enabled, queryFn: () => enquiryRows(s) })

export const usePartnerCounts = (enabled: boolean) =>
  useQuery({
    queryKey: [R, 'orgs'],
    enabled,
    queryFn: () =>
      settleMetrics([
        ['total', 'Partner profiles', () => svc.orgCount()],
        ['active', 'Active', () => svc.orgCount('active')],
        ['suspended', 'Suspended', () => svc.orgCount('suspended')],
      ]),
  })

export const usePartnerRows = (enabled: boolean) =>
  useQuery({ queryKey: [R, 'org-rows'], enabled, queryFn: svc.orgRows })

export const useOutboxCounts = (enabled: boolean) =>
  useQuery({
    queryKey: [R, 'outbox'],
    enabled,
    queryFn: () =>
      settleMetrics(
        DELIVERY_STATUSES.map((s): [string, string, () => Promise<number>] => [
          s,
          DELIVERY_LABEL[s],
          () => svc.outboxCount(s),
        ]),
      ),
  })

export const useBackendKpis = (range: { from?: string; to?: string }, enabled: boolean) =>
  useQuery({
    queryKey: [R, 'kpis', range.from ?? '', range.to ?? ''],
    enabled,
    queryFn: () => svc.kpis(range),
  })
