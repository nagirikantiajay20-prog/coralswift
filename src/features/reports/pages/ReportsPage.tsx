import { useMemo } from 'react'
import { NavLink, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from '@/features/business-enquiries/types'
import { humanize } from '@/features/partner-applications/utils/format'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { ModuleKey } from '@/config/permissions'
import {
  ApplicationsSection,
  CommunicationsSection,
  EnquirySection,
  OverviewSection,
  PartnersSection,
} from '../components/Sections'
import { DEFAULT_FILTERS, type ReportFilters, type Section } from '../types'
import { PRESET_LABEL, PRESETS, resolveRange } from '../utils/range'

const schema = z.object({
  preset: z.enum(PRESETS).catch(DEFAULT_FILTERS.preset),
  customFrom: z.string().catch(''),
  customTo: z.string().catch(''),
  type: z.enum(['all', ...ENQUIRY_TYPES]).catch('all'),
  status: z.enum(['all', ...ENQUIRY_STATUSES]).catch('all'),
})

/** Section -> permission module that gates it (UI hint only; the backend authorizes every call). */
const GATE: Record<Section, ModuleKey> = {
  overview: 'reports',
  applications: 'applications',
  enquiries: 'enquiries',
  strategic: 'strategicEnquiries',
  partners: 'partners',
  communications: 'communications',
}
const TITLE: Record<Section, string> = {
  overview: 'Overview',
  applications: 'Applications & onboarding',
  enquiries: 'Business enquiries',
  strategic: 'Strategic / M&A',
  partners: 'Partners',
  communications: 'Communications',
}

export default function ReportsPage() {
  const { section: raw } = useParams()
  const section = (raw ?? 'overview') as Section
  const { can } = useAuth()
  const [sp, setSp] = useSearchParams()
  const filters: ReportFilters = useMemo(() => {
    const o: Record<string, string> = {}
    sp.forEach((v, k) => (o[k] = v))
    return schema.parse(o)
  }, [sp])
  const range = useMemo(
    () => resolveRange(filters.preset, filters.customFrom, filters.customTo),
    [filters],
  )

  const set = (patch: Partial<ReportFilters>) => {
    const next = { ...filters, ...patch }
    const p = new URLSearchParams()
    ;(Object.keys(next) as (keyof ReportFilters)[]).forEach((k) => {
      if (next[k] !== DEFAULT_FILTERS[k]) p.set(k, next[k])
    })
    setSp(p, { replace: true })
  }

  const visible = (Object.keys(GATE) as Section[]).filter((s) => can(GATE[s]))
  const known = section in GATE
  const allowed = known && can(GATE[section])
  const showEnqFilters = section === 'enquiries' || section === 'strategic'

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Counts are exact backend totals; charts built from loaded records say so when partial."
      />
      <nav aria-label="Report categories" className="mb-4 flex flex-wrap gap-2">
        {visible.map((s) => (
          <NavLink
            key={s}
            to={{
              pathname: s === 'overview' ? '/admin/reports' : `/admin/reports/${s}`,
              search: sp.toString(),
            }}
            end
            className={({ isActive }) =>
              `rounded-md border px-3 py-1.5 text-sm ${isActive ? 'border-coral-ink bg-warm font-medium' : 'border-line'}`
            }
          >
            {TITLE[s]}
          </NavLink>
        ))}
      </nav>

      <div
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4"
        role="group"
        aria-label="Report filters"
      >
        <FilterDropdown
          label="Date range"
          value={filters.preset}
          options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
          onChange={(preset) => set({ preset })}
        />
        {filters.preset === 'custom' && (
          <>
            <Input
              type="date"
              aria-label="From date"
              className="w-auto"
              value={filters.customFrom}
              max={filters.customTo || undefined}
              onChange={(e) => set({ customFrom: e.target.value })}
            />
            <Input
              type="date"
              aria-label="To date"
              className="w-auto"
              value={filters.customTo}
              min={filters.customFrom || undefined}
              onChange={(e) => set({ customTo: e.target.value })}
            />
          </>
        )}
        {showEnqFilters && (
          <>
            {section === 'enquiries' && (
              <FilterDropdown
                label="Enquiry type"
                value={filters.type}
                options={[
                  { value: 'all', label: 'All business types' },
                  ...ENQUIRY_TYPES.filter((t) => t !== 'strategic').map((t) => ({
                    value: t,
                    label: humanize(t),
                  })),
                ]}
                onChange={(type) => set({ type })}
              />
            )}
            <FilterDropdown
              label="Status"
              value={filters.status}
              options={[
                { value: 'all', label: 'All statuses' },
                ...ENQUIRY_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
              ]}
              onChange={(status) => set({ status })}
            />
          </>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSp(new URLSearchParams(), { replace: true })}
        >
          Reset filters
        </Button>
        <p className="text-xs text-muted">
          {range.error
            ? ''
            : `Range: ${range.from ? new Date(range.from).toLocaleDateString() : 'any'} – ${range.to ? new Date(range.to).toLocaleDateString() : 'any'}`}
          {showEnqFilters
            ? ''
            : ' · date range applies where the backend supports it (noted per report)'}
        </p>
        {range.error && (
          <p role="alert" className="w-full text-sm text-rose">
            {range.error}
          </p>
        )}
      </div>

      {!known ? (
        <EmptyState title="Unknown report" description="Choose a category above." />
      ) : !allowed ? (
        <EmptyState
          title="Permission denied"
          description="Your role does not include access to this report. Access is enforced by the backend."
        />
      ) : range.error ? (
        <EmptyState title="Fix the date range to load this report" />
      ) : (
        <div key={section}>
          {section === 'overview' && (
            <OverviewSection
              range={range}
              can={(m) => can(m)}
              canStrategic={can('strategicEnquiries')}
            />
          )}
          {section === 'applications' && <ApplicationsSection range={range} filters={filters} />}
          {section === 'enquiries' && (
            <EnquirySection range={range} filters={filters} canStrategic={false} />
          )}
          {section === 'strategic' && (
            <EnquirySection
              range={range}
              filters={filters}
              strategic
              canStrategic={can('strategicEnquiries')}
            />
          )}
          {section === 'partners' && <PartnersSection />}
          {section === 'communications' && <CommunicationsSection />}
        </div>
      )}
    </>
  )
}
