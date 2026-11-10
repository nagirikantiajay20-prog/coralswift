import {
  ArrowLeft,
  FileCheck,
  FileClock,
  FileMinus,
  FileText,
  FileX,
  RefreshCw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState, LoadingState } from '@/components/common/states'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApplicationDetail } from '@/features/partner-applications/hooks/useApplications'
import { DOC_CATEGORIES, REVIEW_STATUSES } from '@/features/partner-applications/types'
import { formatDate, humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { DocStatusBadge } from '../components/DocumentParts'
import type { DocRow } from '../types'
import {
  filterRows,
  formatSize,
  missingCategories,
  REVIEW_LABEL,
  summarize,
  toDocRow,
  type DocFilters,
} from '../utils/documents'

export default function ApplicationDocumentsPage() {
  const { appId = '' } = useParams()
  const q = useApplicationDetail(appId)
  const [f, setF] = useState<DocFilters>({ q: '', category: 'all', status: 'all' })
  const docs = q.data?.documents
  const rows = useMemo(
    () => (docs ?? []).filter((d) => d.current_version).map((d) => toDocRow(appId, d)),
    [docs, appId],
  )

  const columns: Column<DocRow>[] = [
    {
      header: 'Document',
      cell: (r) => (
        <Link
          to={`/admin/documents/${appId}/${r.id}`}
          className="break-all font-medium text-coral-ink underline"
        >
          {r.filename ?? r.id}
        </Link>
      ),
    },
    { header: 'Category', cell: (r) => humanize(r.category) },
    { header: 'Version', cell: (r) => (r.versionNo ? `v${r.versionNo}` : '—') },
    { header: 'Size', cell: (r) => formatSize(r.size) },
    { header: 'Uploaded', cell: (r) => formatDate(r.uploadedAt) },
    { header: 'Review status', cell: (r) => <DocStatusBadge status={r.reviewStatus} /> },
  ]

  return (
    <>
      <Link
        to="/admin/documents"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> All applications
      </Link>
      {q.isPending ? (
        <LoadingState label="Loading documents…" />
      ) : q.isError || !q.data ? (
        <Card>
          <ErrorState
            message={q.error ? toAppError(q.error).message : 'Application not found.'}
            onRetry={() => q.refetch()}
          />
        </Card>
      ) : (
        <>
          <PageHeader
            title={`Documents: ${q.data.application.reference}`}
            description={q.data.application.organization_name}
            actions={
              <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
                <RefreshCw
                  className={q.isFetching ? 'size-4 animate-spin' : 'size-4'}
                  aria-hidden
                />
                Refresh
              </Button>
            }
          />
          <Summary docs={q.data.documents} />
          <Card className="mb-6">
            <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
              <div className="w-full sm:w-64">
                <SearchInput
                  value={f.q}
                  onChange={(v) => setF({ ...f, q: v })}
                  label="Search documents"
                />
              </div>
              <FilterDropdown
                label="Category"
                value={f.category}
                onChange={(category) => setF({ ...f, category })}
                options={[
                  { value: 'all', label: 'All categories' },
                  ...DOC_CATEGORIES.map((c) => ({ value: c, label: humanize(c) })),
                ]}
              />
              <FilterDropdown
                label="Review status"
                value={f.status}
                onChange={(status) => setF({ ...f, status })}
                options={[
                  { value: 'all', label: 'All review statuses' },
                  ...REVIEW_STATUSES.map((s) => ({ value: s, label: REVIEW_LABEL[s] })),
                ]}
              />
            </div>
            <DataTable
              columns={columns}
              rows={filterRows(rows, f)}
              rowKey={(r) => r.id}
              emptyTitle={rows.length ? 'No documents match the filters' : 'No documents uploaded'}
            />
          </Card>
          <Missing docs={q.data.documents} />
        </>
      )}
    </>
  )
}

function Summary({ docs }: { docs: Parameters<typeof summarize>[0] }) {
  const s = summarize(docs)
  return (
    <section
      aria-label="Document metrics"
      className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <StatCard
        label="Uploaded documents"
        value={s.total}
        icon={FileText}
        hint={`Latest upload ${formatDate(s.latestUpload)}`}
      />
      <StatCard label="Pending review" value={s.pending} icon={FileClock} />
      <StatCard label="Accepted" value={s.accepted} icon={FileCheck} />
      <StatCard label="Rejected" value={s.rejected} icon={FileX} />
      <StatCard label="Replacement requested" value={s.replacementRequested} icon={RefreshCw} />
      <StatCard label="Missing categories" value={s.missing} icon={FileMinus} />
    </section>
  )
}

/** Same category list as the Phase 6 checklist (backend PartnerDocCategory). */
function Missing({ docs }: { docs: Parameters<typeof missingCategories>[0] }) {
  const missing = missingCategories(docs)
  return (
    <Card>
      <h2 className="border-b border-line px-5 py-3 text-base font-semibold">Missing documents</h2>
      <div className="p-5 text-sm">
        {missing.length ? (
          <ul className="flex flex-wrap gap-2">
            {missing.map((c) => (
              <li key={c}>
                <StatusBadge label={humanize(c)} tone="warning" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Every backend document category has an uploaded file.</p>
        )}
        <p className="mt-3 text-muted">
          To ask the applicant for missing items, use “Request information” in the application
          review workspace (it sends the requested categories through the backend).
        </p>
      </div>
    </Card>
  )
}
