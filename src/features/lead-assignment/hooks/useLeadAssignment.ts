import { useQueries, useQuery } from '@tanstack/react-query'
import { leadAssignmentService as svc, type LeadFilters } from '../services/leadAssignmentService'
import type { AssignCategory } from '../types'

/**
 * Keys start with 'enquiries' / 'applications' so the existing Phase 5/8/9 mutations
 * (which invalidate those prefixes) refresh these queries after every assignment.
 */
const prefix = (c: AssignCategory) => (c === 'applications' ? 'applications' : 'enquiries')

export const useLeadList = (c: AssignCategory, f: LeadFilters, page: number, size: number) =>
  useQuery({
    queryKey: [prefix(c), 'lead', 'list', c, f, page, size],
    queryFn: () => svc.list(c, f, page, size),
    placeholderData: (prev) => prev,
    retry: false,
  })

export const useCategoryCounts = (cats: AssignCategory[], me: string) =>
  useQueries({
    queries: cats.map((c) => ({
      queryKey: [prefix(c), 'lead', 'counts', c, me],
      queryFn: () => svc.counts(c, me),
      retry: false,
      staleTime: 30_000,
    })),
  })

/** Newest 100 records per category: the basis of the workload view (a sample, not an aggregate). */
export const WORKLOAD_SAMPLE = 100
export const useWorkloadSample = (cats: AssignCategory[]) =>
  useQueries({
    queries: cats.map((c) => ({
      queryKey: [prefix(c), 'lead', 'workload', c],
      queryFn: () => svc.list(c, {}, 1, WORKLOAD_SAMPLE),
      retry: false,
      staleTime: 30_000,
    })),
  })

/** Names only; the list endpoint is super-administrator only, so others fall back to short ids. */
export const useStaffNames = (enabled: boolean) =>
  useQuery({
    queryKey: ['staff-names'],
    queryFn: svc.staffNames,
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  })
