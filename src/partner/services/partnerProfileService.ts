import { partnerEndpoints as E } from '../config/endpoints'
import { api } from '@/services/api/client'

/**
 * Types mirror openapi.json (2026-11-10): OrganizationOut, ProfileUpdate, ChangeRequestIn/Out,
 * RevisionOut. The organization comes from the token server-side; no id is ever sent.
 */
export const SERVICE_CATEGORIES = [
  'erp',
  'web_applications',
  'custom_software',
  'cloud_infrastructure',
  'testing_maintenance',
  'digital_transformation',
  'medical_coding_billing',
  'healthcare_support',
  'data_entry_document_processing',
  'banking_kyc_mortgage',
  'mutual_fund_operations',
  'back_office',
] as const
export interface ClientReference {
  name: string
  organization: string
  contact: string
}
export interface AuthorizedContact {
  name: string
  designation: string
  email: string
  phone: string
}
export interface Organization {
  id: string
  legal_name: string
  status: string
  registration_number: string | null
  year_established: number | null
  employee_count: number | null
  annual_turnover_inr_crore: string | null
  registered_address: string | null
  country: string | null
  website: string | null
  service_categories: string[] | null
  technical_capabilities: string | null
  infrastructure_summary: string | null
  business_description: string | null
  client_references: ClientReference[] | null
  authorized_contacts: AuthorizedContact[] | null
  profile_version: number
}
/** Editable subset (ProfileUpdate). `id`, `status`, `profile_version` are system-controlled. */
export type ProfileChanges = Partial<Omit<Organization, 'id' | 'status' | 'profile_version'>>
export interface ChangeRequest {
  id: string
  changes: Record<string, unknown>
  reason: string
  status: string
  decision_note: string | null
  created_at: string
  decided_at: string | null
}
export interface Revision {
  version: number
  changed_by: string // internal user id: never rendered
  changes: Record<string, unknown>
  created_at: string
}

type Env<T> = { data: T | null }

export const partnerProfileService = {
  get: async () => (await api.get<Env<Organization>>(E.organization)).data.data,
  /** Applied immediately and recorded in history. 409 when `expected_version` is stale. */
  update: async (changes: ProfileChanges, expected_version: number) =>
    (await api.put<Env<Organization>>(E.organization, { ...changes, expected_version })).data.data,
  requests: async () => (await api.get<Env<ChangeRequest[]>>(E.changeRequests)).data.data ?? [],
  /** Staff-reviewed change; `reason` is required by the backend. */
  request: (changes: ProfileChanges, reason: string) =>
    api.post(E.changeRequests, { changes, reason }),
  history: async () => (await api.get<Env<Revision[]>>(E.history)).data.data ?? [],
}

/** Backend EditableFieldOut (GET /partner/organization/editable-fields). */
export interface EditableField {
  name: string
  direct_update: boolean
  approval_required: boolean
  nullable: boolean
  null_clears: boolean
}
