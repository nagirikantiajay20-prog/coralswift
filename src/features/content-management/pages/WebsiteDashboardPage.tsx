import { Archive, CheckCircle2, ClipboardCheck, FileText, Globe, PenLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { CapabilityMatrix } from '../components/ContentParts'
import { useContentTotal } from '../hooks/useContent'
import type { ContentStatus } from '../types'

function Total({
  label,
  status,
  icon,
  to,
}: {
  label: string
  status?: ContentStatus
  icon: typeof Globe
  to?: string
}) {
  const q = useContentTotal(status)
  const card = (
    <StatCard
      label={label}
      icon={icon}
      value={q.data ?? undefined}
      loading={q.isPending}
      error={q.isError}
      hint={q.isSuccess && q.data === null ? 'Total not provided by the backend' : undefined}
    />
  )
  return to ? <Link to={to}>{card}</Link> : card
}

const P = '/admin/website/pages'

export default function WebsiteDashboardPage() {
  return (
    <>
      <PageHeader
        title="Website content"
        description="Counts are exact backend totals (meta.total), never summed from a page of results."
        actions={
          <Button asChild>
            <Link to={`${P}/new`}>New content</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Total label="Total content items" icon={Globe} to={P} />
        <Total
          label="Published"
          status="published"
          icon={CheckCircle2}
          to={`${P}?status=published`}
        />
        <Total label="Drafts" status="draft" icon={PenLine} to={`${P}?status=draft`} />
        <Total
          label="Pending approval (in review)"
          status="in_review"
          icon={ClipboardCheck}
          to="/admin/website/approval"
        />
        <Total
          label="Approved, awaiting publish"
          status="approved"
          icon={FileText}
          to={`${P}?status=approved`}
        />
        <Total label="Archived" status="archived" icon={Archive} to={`${P}?status=archived`} />
      </div>
      <p className="mt-3 text-sm text-muted">
        Unavailable: “unpublished” has no status of its own (unpublishing moves an item per backend
        rules), total media assets (no media API), and recently updated content (the API returns no
        updated-at or updated-by).
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Backend support</CardTitle>
        </CardHeader>
        <CapabilityMatrix />
      </Card>
    </>
  )
}
