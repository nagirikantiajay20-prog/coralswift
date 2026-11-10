import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { pageCount } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { useClaims, useCreateClaim, useUpdateClaim } from '../hooks/useContent'
import {
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  type Claim,
  type ClaimCategory,
  type ClaimStatus,
} from '../types'
import {
  CLAIM_CATEGORY_LABEL,
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_TONE,
  claimSchema,
} from '../utils/content'

const PAGE_SIZE = 20
type ClaimForm = { claim_text: string; category: ClaimCategory; evidence_ref: string }

export default function ClaimsPage() {
  const isSuper = useAuthStore((s) => s.user?.role) === 'super_administrator'
  const [status, setStatus] = useState<ClaimStatus | ''>('')
  const [category, setCategory] = useState<ClaimCategory | ''>('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const q = useClaims({
    status: status || undefined,
    category: category || undefined,
    page,
    page_size: PAGE_SIZE,
  })
  const create = useCreateClaim()
  const update = useUpdateClaim()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClaimForm>({
    resolver: zodResolver(claimSchema),
    defaultValues: { claim_text: '', category: 'company', evidence_ref: '' },
  })

  const columns: Column<Claim>[] = [
    {
      header: 'Claim',
      cell: (r) => <span className="max-w-md whitespace-pre-wrap">{r.claim_text}</span>,
    },
    { header: 'Category', cell: (r) => CLAIM_CATEGORY_LABEL[r.category] ?? r.category },
    {
      header: 'Evidence status',
      cell: (r) =>
        isSuper ? (
          <Select
            aria-label="Evidence status"
            className="w-auto"
            value={r.evidence_status}
            disabled={update.isPending}
            onChange={(e) =>
              update.mutate({ id: r.id, body: { evidence_status: e.target.value as ClaimStatus } })
            }
          >
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLAIM_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        ) : (
          <StatusBadge
            label={CLAIM_STATUS_LABEL[r.evidence_status]}
            tone={CLAIM_STATUS_TONE[r.evidence_status]}
          />
        ),
    },
    { header: 'Evidence reference', cell: (r) => r.evidence_ref ?? '—' },
    {
      header: 'May be published',
      cell: (r) =>
        isSuper ? (
          <input
            type="checkbox"
            aria-label="Publication permission"
            checked={r.publication_permission}
            disabled={update.isPending}
            onChange={(e) =>
              update.mutate({ id: r.id, body: { publication_permission: e.target.checked } })
            }
          />
        ) : r.publication_permission ? (
          'Yes'
        ) : (
          'No'
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Public claims"
        description="Claims that content may reference. New claims start as pending verification; only super administrators verify them (enforced by the backend). Un-clearing a claim pulls linked content offline."
        actions={<Button onClick={() => setOpen(true)}>Register claim</Button>}
      />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <FilterDropdown
            label="Evidence status"
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...CLAIM_STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s] })),
            ]}
          />
          <FilterDropdown
            label="Category"
            value={category}
            onChange={(v) => {
              setCategory(v)
              setPage(1)
            }}
            options={[
              { value: '', label: 'All categories' },
              ...CLAIM_CATEGORIES.map((c) => ({ value: c, label: CLAIM_CATEGORY_LABEL[c] })),
            ]}
          />
        </div>
        {q.isPending ? (
          <LoadingState label="Loading claims…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={q.data.rows}
              rowKey={(r) => r.id}
              emptyTitle="No claims"
            />
            <Pagination
              page={page}
              pageCount={pageCount(q.data.meta, page, PAGE_SIZE, q.data.rows.length)}
              onChange={setPage}
            />
          </>
        )}
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Register a public claim"
          description="It starts as pending verification and cannot support published content until verified."
        >
          <form
            className="space-y-4 p-5"
            noValidate
            onSubmit={handleSubmit((v) =>
              create.mutate(
                {
                  ...v,
                  claim_text: v.claim_text.trim(),
                  evidence_ref: v.evidence_ref.trim() || null,
                },
                {
                  onSuccess: () => {
                    reset()
                    setOpen(false)
                  },
                },
              ),
            )}
          >
            <FormField label="Claim text" error={errors.claim_text?.message}>
              <textarea
                rows={3}
                className="w-full rounded-md border border-line px-3 py-2 text-sm"
                {...register('claim_text')}
              />
            </FormField>
            <FormField label="Category" error={errors.category?.message}>
              <Select {...register('category')}>
                {CLAIM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CLAIM_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Evidence reference (optional)" error={errors.evidence_ref?.message}>
              <Input {...register('evidence_ref')} />
            </FormField>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={create.isPending}>
                Register
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
