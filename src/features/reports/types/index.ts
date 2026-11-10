import type { EnquiryStatus, EnquiryType } from '@/features/business-enquiries/types'
import type { Preset, ResolvedRange } from '../utils/range'

export const SECTIONS = [
  'overview',
  'applications',
  'enquiries',
  'strategic',
  'partners',
  'communications',
] as const
export type Section = (typeof SECTIONS)[number]

/** Filters mirrored in the URL so they survive navigation and reloads. */
export interface ReportFilters {
  preset: Preset
  customFrom: string
  customTo: string
  type: EnquiryType | 'all'
  status: EnquiryStatus | 'all'
}

export const DEFAULT_FILTERS: ReportFilters = {
  preset: '30d',
  customFrom: '',
  customTo: '',
  type: 'all',
  status: 'all',
}

/** One counted number. `value` undefined + `failed` = unavailable (never shown as zero). */
export interface Metric {
  key: string
  label: string
  value?: number
  failed?: boolean
}

export interface EnquiryScope {
  types: EnquiryType[]
  status?: EnquiryStatus
  range: ResolvedRange
}
