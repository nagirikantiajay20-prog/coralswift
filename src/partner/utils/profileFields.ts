import { z } from 'zod'
import { SERVICE_CATEGORIES, type ProfileChanges } from '../services/partnerProfileService'

export type SectionKey = 'company' | 'business' | 'workforce' | 'financial' | 'contacts'

/** Only fields present in OrganizationOut/ProfileUpdate. */
export const SECTIONS: Record<SectionKey, { title: string; fields: string[] }> = {
  company: {
    title: 'Company information',
    fields: [
      'legal_name',
      'registration_number',
      'year_established',
      'registered_address',
      'country',
      'website',
    ],
  },
  business: {
    title: 'Business information',
    fields: ['business_description', 'service_categories', 'client_references'],
  },
  workforce: {
    title: 'Workforce and infrastructure',
    fields: ['employee_count', 'technical_capabilities', 'infrastructure_summary'],
  },
  financial: { title: 'Financial information', fields: ['annual_turnover_inr_crore'] },
  contacts: { title: 'Authorized contacts', fields: ['authorized_contacts'] },
}
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[]

export const LABELS: Record<string, string> = {
  legal_name: 'Legal name',
  registration_number: 'Registration number',
  year_established: 'Year established',
  registered_address: 'Registered address',
  country: 'Country (2-letter code)',
  website: 'Website',
  business_description: 'Business description',
  service_categories: 'Service categories',
  client_references: 'Client references',
  employee_count: 'Employee count',
  technical_capabilities: 'Technical capabilities',
  infrastructure_summary: 'Infrastructure summary',
  annual_turnover_inr_crore: 'Annual turnover (INR crore)',
  authorized_contacts: 'Authorized contacts',
}
export const label = (f: string) => LABELS[f] ?? f.replace(/_/g, ' ')
export const humanCategory = (c: string) =>
  c.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase())

/** Section a backend `missing_fields` entry belongs to (undefined when unknown). */
export const sectionOf = (field: string): SectionKey | undefined =>
  SECTION_KEYS.find((k) => SECTIONS[k].fields.includes(field))

const text = (max: number) =>
  z.string().trim().min(1, 'Required').max(max, `At most ${max} characters`)
const ref = z.object({ name: text(150), organization: text(200), contact: text(200) })
const contact = z.object({
  name: text(150),
  designation: text(150),
  email: z.string().trim().email('Enter a valid email'),
  phone: text(30),
})

/** Per-field rules copied from ProfileUpdate; no extra rules invented. */
const rules: Record<string, z.ZodType> = {
  legal_name: text(200),
  registration_number: text(200),
  year_established: z.coerce.number().int('Whole number').min(1800, 'Must be 1800 or later'),
  registered_address: text(500),
  country: z.string().trim().length(2, 'Use the 2-letter country code'),
  website: z.string().trim().min(1, 'Required'),
  business_description: text(4000),
  service_categories: z.array(z.enum(SERVICE_CATEGORIES)).max(12),
  client_references: z.array(ref).max(10),
  employee_count: z.coerce.number().int('Whole number').min(0).max(10_000_000),
  technical_capabilities: text(4000),
  infrastructure_summary: text(4000),
  annual_turnover_inr_crore: z.coerce.number().min(0, 'Cannot be negative'),
  authorized_contacts: z.array(contact).max(10),
}

export type Draft = Record<string, unknown>
const isBlank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '')
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Validates a section draft against the saved values and returns only the changed fields (the
 * backend update is partial). The backend rejects empty strings, so clearing an existing value is
 * reported as an error instead of being silently dropped.
 */
export function buildChanges(section: SectionKey, draft: Draft, original: Draft) {
  const changes: Draft = {}
  const errors: Record<string, string> = {}
  for (const f of SECTIONS[section].fields) {
    const d = draft[f]
    const o = original[f]
    if (same(d, o)) continue
    const emptyList = Array.isArray(d) && d.length === 0
    if (isBlank(d) || emptyList) {
      const hadValue = !isBlank(o) && !(Array.isArray(o) && o.length === 0)
      if (hadValue) errors[f] = 'Cannot be cleared'
      continue
    }
    const r = rules[f].safeParse(d)
    if (!r.success) errors[f] = r.error.issues[0]?.message ?? 'Invalid'
    else changes[f] = f === 'annual_turnover_inr_crore' ? String(d).trim() : r.data
  }
  return { changes: changes as ProfileChanges, errors }
}
