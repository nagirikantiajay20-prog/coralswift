import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { formatDate, formatDateTime, humanize } from '@/features/partner-applications/utils/format'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

/** Backend PartnerDocCategory enum (openapi.json). */
export const DOC_CATEGORIES = [
  'registration_proof',
  'operating_history',
  'employee_strength',
  'financial_statements',
  'service_portfolio',
  'infrastructure_summary',
  'client_references',
  'authorized_contact',
] as const

/** Backend StaffDocumentRequestOut. */
export interface StaffDocumentRequest {
  id: string
  application_id: string | null
  application_reference: string | null
  category: string
  note: string
  due_at: string | null
  status: 'open' | 'fulfilled' | 'cancelled'
  is_overdue: boolean
  fulfilled_document_id: string | null
  fulfilled_at: string | null
  created_at: string
  created_by_name: string | null
}

const base = (appId: string) => `/api/v1/reviewer/applications/${appId}/document-requests`
const svc = {
  list: async (appId: string) =>
    (await api.get<{ data: StaffDocumentRequest[] | null }>(base(appId))).data.data ?? [],
  create: async (appId: string, body: { category: string; note: string; due_at?: string }) =>
    api.post(base(appId), body),
  cancel: async (id: string) => api.post(`/api/v1/reviewer/document-requests/${id}/cancel`),
}

const TONE = { open: 'warning', fulfilled: 'success', cancelled: 'neutral' } as const

/** Staff side of "additional document requests": ask the partner for a document, track and withdraw it. */
export function DocumentRequests({ appId, canRequest }: { appId: string; canRequest: boolean }) {
  const qc = useQueryClient()
  const key = ['applications', appId, 'document-requests']
  const q = useQuery({ queryKey: key, queryFn: () => svc.list(appId), retry: false })
  const refresh = () => qc.invalidateQueries({ queryKey: key })
  const [form, setForm] = useState({ category: DOC_CATEGORIES[0] as string, note: '', due: '' })
  const [cancelId, setCancelId] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: () =>
      svc.create(appId, {
        category: form.category,
        note: form.note.trim(),
        // end of the chosen local day
        due_at: form.due ? new Date(`${form.due}T23:59:59`).toISOString() : undefined,
      }),
    onSuccess: () => {
      setForm({ ...form, note: '', due: '' })
      toast.success('Document request sent to the partner.')
      void refresh()
    },
  })
  const cancel = useMutation({
    mutationFn: svc.cancel,
    onSuccess: () => {
      toast.success('Request withdrawn.')
      void refresh()
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (form.note.trim()) create.mutate()
  }
  const rows = q.data ?? []
  const err = create.error ?? cancel.error

  return (
    <div>
      {q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <p role="status" className="text-sm text-muted">
          Loading requests…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No additional document requests.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="rounded border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {humanize(r.category)}{' '}
                  <StatusBadge label={humanize(r.status)} tone={TONE[r.status]} />
                  {r.status === 'open' && r.is_overdue && (
                    <span className="ml-2">
                      <StatusBadge label="Overdue" tone="danger" />
                    </span>
                  )}
                </p>
                {r.status === 'open' && canRequest && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={cancel.isPending}
                    onClick={() => setCancelId(r.id)}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{r.note}</p>
              <p className="mt-1 text-xs text-muted">
                Requested {formatDateTime(r.created_at)}
                {r.created_by_name ? ` by ${r.created_by_name}` : ''}
                {r.due_at ? ` · Due ${formatDate(r.due_at)}` : ''}
                {r.fulfilled_at ? ` · Fulfilled ${formatDateTime(r.fulfilled_at)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canRequest && (
        <form
          onSubmit={submit}
          className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2"
        >
          <h3 className="text-xs uppercase text-muted sm:col-span-2">Request another document</h3>
          <div>
            <Label htmlFor="dr-cat">Document category</Label>
            <Select
              id="dr-cat"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="dr-due">Deadline (optional)</Label>
            <Input
              id="dr-due"
              type="date"
              value={form.due}
              onChange={(e) => setForm({ ...form, due: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="dr-note">What is needed (visible to the partner)</Label>
            <textarea
              id="dr-note"
              className="min-h-24 w-full rounded-md border border-line bg-white p-2 text-sm"
              maxLength={4000}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              required
            />
          </div>
          {err && (
            <p role="alert" className="text-sm text-rose-800 sm:col-span-2">
              {toAppError(err).message}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!form.note.trim() || create.isPending}>
              {create.isPending ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
        title="Withdraw this request?"
        description="The partner will no longer be asked for this document."
        confirmLabel="Withdraw"
        destructive
        onConfirm={() => cancelId && cancel.mutate(cancelId)}
      />
    </div>
  )
}
