import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { businessEnquiriesService } from '@/features/business-enquiries/services/businessEnquiriesService'
import { enquiryEndpoints as e } from '@/config/endpoints'
import { formatDateTime, humanize, pageCount } from '@/features/partner-applications/utils/format'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

/** Backend FollowUpOut (GET /admin/follow-ups). */
interface FollowUp {
  id: string
  note: string
  due_at: string | null
  completed_at: string | null
  kind?: string
  status?: string
  assignee_id?: string | null
  assignee_name?: string | null
  author_name?: string | null
  enquiry_id?: string | null
  enquiry_reference?: string | null
}
type Status = 'open' | 'completed' | 'cancelled'
type Kind = 'note' | 'follow_up' | 'communication'
const PAGE_SIZE = 20

const svc = {
  list: async (p: Record<string, unknown>) => {
    const { data } = await api.get<{
      data: FollowUp[] | null
      meta: Record<string, unknown> | null
    }>(e.allFollowUps, { params: p })
    return { rows: data.data ?? [], meta: data.meta }
  },
  complete: (f: FollowUp) => api.post(e.completeFollowUp(f.enquiry_id!, f.id)),
  cancel: (f: FollowUp) => api.post(e.cancelFollowUp(f.enquiry_id!, f.id)),
  reschedule: (f: FollowUp, dueAt: string) =>
    api.patch(e.followUp(f.enquiry_id!, f.id), { due_at: dueAt }),
  /** FollowUpUpdate: only the keys present change; null clears due_at / assignee_id. */
  edit: (f: FollowUp, body: { note?: string; due_at?: string | null; assignee_id?: string | null }) =>
    api.patch(e.followUp(f.enquiry_id!, f.id), body),
}

/** Global follow-up / communication list across the enquiries the caller may see (server-filtered). */
export function AllFollowUps() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status | 'all'>('open')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(1)
  const [due, setDue] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<FollowUp | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [clearDue, setClearDue] = useState(false)
  const staff = useQuery({
    queryKey: ['enquiries', 'assignees'],
    queryFn: () => businessEnquiriesService.staff('enquiries'),
    enabled: !!editing,
    staleTime: 60_000,
  })
  const startEdit = (f: FollowUp) => {
    setEditing(f)
    setEditNote(f.note)
    setEditAssignee(f.assignee_id ?? '')
    setClearDue(false)
  }
  const saveEdit = () => {
    if (!editing) return
    const body: { note?: string; due_at?: null; assignee_id?: string | null } = {}
    if (editNote.trim() && editNote.trim() !== editing.note) body.note = editNote.trim()
    if ((editAssignee || null) !== (editing.assignee_id ?? null)) body.assignee_id = editAssignee || null
    if (clearDue && editing.due_at) body.due_at = null
    if (!Object.keys(body).length) return setEditing(null)
    act.mutate({ run: () => svc.edit(editing, body), done: 'Follow-up updated.' })
    setEditing(null)
  }
  const params = {
    status: status === 'all' ? undefined : status,
    kind: kind === 'all' ? undefined : kind,
    mine: mine || undefined,
    sort: 'due_at',
    page,
    page_size: PAGE_SIZE,
  }
  const q = useQuery({
    queryKey: ['enquiries', 'follow-ups-all', params],
    queryFn: () => svc.list(params),
    retry: false,
  })
  const act = useMutation({
    mutationFn: (v: { run: () => Promise<unknown>; done: string }) => v.run(),
    onSuccess: (_d, v) => {
      toast.success(v.done)
      void qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (err) => toast.error(toAppError(err).message),
  })
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }
  const counts = q.data?.meta
    ? Object.entries(q.data.meta).filter(([, v]) => typeof v === 'number')
    : []

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>All follow-ups and communications</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <FilterDropdown<Status | 'all'>
          label="Status"
          value={status}
          onChange={reset(setStatus)}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'all', label: 'All' },
          ]}
        />
        <FilterDropdown<Kind | 'all'>
          label="Kind"
          value={kind}
          onChange={reset(setKind)}
          options={[
            { value: 'all', label: 'All kinds' },
            { value: 'follow_up', label: 'Follow-up' },
            { value: 'communication', label: 'Communication' },
            { value: 'note', label: 'Note' },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={(ev) => reset(setMine)(ev.target.checked)}
          />
          Assigned to me
        </label>
        {counts.length > 0 && (
          <p className="text-xs text-muted">
            {counts.map(([k, v]) => `${humanize(k)}: ${String(v)}`).join(' · ')}
          </p>
        )}
      </div>
      {q.isPending ? (
        <LoadingState label="Loading follow-ups…" />
      ) : q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
      ) : q.data.rows.length === 0 ? (
        <EmptyState title="No follow-ups match these filters" />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {q.data.rows.map((f) => (
              <li key={f.id} className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{f.enquiry_reference ?? '—'}</span>
                  <StatusBadge label={humanize(f.kind ?? 'follow_up')} />
                  <StatusBadge label={humanize(f.status ?? 'open')} />
                  <span className="text-muted">
                    Due {f.due_at ? formatDateTime(f.due_at) : '—'} ·{' '}
                    {f.assignee_name ?? 'Unassigned'}
                  </span>
                </div>
                <p className="whitespace-pre-line">{f.note}</p>
                {f.status === 'open' && f.enquiry_id && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      disabled={act.isPending}
                      onClick={() =>
                        act.mutate({ run: () => svc.complete(f), done: 'Marked complete.' })
                      }
                    >
                      Complete
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => startEdit(f)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={act.isPending}
                      onClick={() =>
                        act.mutate({ run: () => svc.cancel(f), done: 'Follow-up cancelled.' })
                      }
                    >
                      Cancel
                    </Button>
                    <Input
                      type="datetime-local"
                      aria-label="New due date"
                      className="w-56"
                      value={due[f.id] ?? ''}
                      onChange={(ev) => setDue({ ...due, [f.id]: ev.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={act.isPending || !due[f.id]}
                      onClick={() =>
                        act.mutate({
                          run: () => svc.reschedule(f, new Date(due[f.id]).toISOString()),
                          done: 'Follow-up rescheduled.',
                        })
                      }
                    >
                      Reschedule
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageCount={pageCount(q.data.meta, page, PAGE_SIZE, q.data.rows.length)}
            onChange={setPage}
          />
        </>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent
          title="Edit follow-up"
          description="Only changed fields are sent."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
              <Button disabled={!editNote.trim() || editNote.length > 4000} onClick={saveEdit}>
                Save changes
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="font-medium">Note</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-line bg-white p-2"
                value={editNote}
                onChange={(ev) => setEditNote(ev.target.value)}
              />
            </label>
            <label className="block">
              <span className="font-medium">Assignee</span>
              <Select value={editAssignee} onChange={(ev) => setEditAssignee(ev.target.value)}>
                <option value="">Unassigned</option>
                {(staff.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </Select>
            </label>
            {editing?.due_at && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clearDue}
                  onChange={(ev) => setClearDue(ev.target.checked)}
                />
                Clear due date
              </label>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
