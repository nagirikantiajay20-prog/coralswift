import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/forms/FormField'
import { DatePicker } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import type { ModuleKey } from '@/config/permissions'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { checkAssignment } from '@/features/lead-assignment/utils/assignment'
import { FormDialog } from '@/features/partner-applications/components/ReviewActions'
import { humanize } from '@/features/partner-applications/utils/format'
import { useEnquiryMutation, useStaff } from '../hooks/useEnquiries'
import {
  followUpSchema,
  meetingConfirmSchema,
  reasonSchema,
  type FollowUpForm,
  type MeetingConfirmForm,
  type ReasonForm,
} from '../schemas'
import { businessEnquiriesService as svc } from '../services/businessEnquiriesService'
import {
  ENQUIRY_STATUSES,
  PRIORITIES,
  type EnquiryRow,
  type EnquiryStatus,
  type Priority,
} from '../types'

const textarea =
  'min-h-24 w-full rounded-md border border-line bg-white p-3 text-sm aria-[invalid=true]:border-rose'

type Kind = 'assign' | 'status' | 'followup' | 'close' | 'confirm' | 'decline' | 'cancel'

/**
 * Role gating is UX only: the module is already guarded by `can('enquiries')` and the backend
 * authorizes every call (its message is shown on 403). The backend documents no transition table,
 * so every EnquiryStatus is offered and the server decides.
 */
export function EnquiryActions({
  enquiry,
  module = 'enquiries',
}: {
  enquiry: EnquiryRow
  module?: ModuleKey
}) {
  const { user, can } = useAuth()
  const [open, setOpen] = useState<Kind | null>(null)
  const close = () => setOpen(null)
  const closeM = useEnquiryMutation(
    () => svc.update(enquiry.id, { status: 'closed' }),
    'Enquiry closed',
    close,
  )
  if (!can(module) || !user) return null
  const btn = (k: Kind, label: string) => (
    <Button variant="secondary" size="sm" onClick={() => setOpen(k)}>
      {label}
    </Button>
  )
  return (
    <div className="flex flex-wrap gap-2">
      {btn('assign', enquiry.assigned_user_id ? 'Reassign' : 'Assign')}
      {btn('status', 'Update status / priority')}
      {btn('followup', 'Add note / follow-up')}
      {enquiry.status !== 'closed' && btn('close', 'Close enquiry')}
      {enquiry.enquiry_type === 'meeting' && (
        <>
          {btn('confirm', 'Confirm meeting')}
          {btn('decline', 'Decline meeting')}
          {btn('cancel', 'Cancel meeting')}
        </>
      )}
      {open === 'confirm' && <MeetingConfirmDialog id={enquiry.id} onClose={close} />}
      {(open === 'decline' || open === 'cancel') && (
        <MeetingReasonDialog id={enquiry.id} action={open} onClose={close} />
      )}
      {open === 'assign' && <AssignDialog enquiry={enquiry} onClose={close} />}
      {open === 'status' && <StatusDialog enquiry={enquiry} onClose={close} />}
      {open === 'followup' && <FollowUpDialog id={enquiry.id} onClose={close} />}
      <ConfirmDialog
        open={open === 'close'}
        onOpenChange={(o) => !o && close()}
        title="Close this enquiry?"
        description={`${enquiry.reference_number} will be marked closed.`}
        confirmLabel="Close enquiry"
        destructive
        onConfirm={() => closeM.mutate(undefined)}
      />
    </div>
  )
}

/** Shared by the enquiry pages and Lead Assignment. Reassigning an owned enquiry asks for confirmation. */
export function AssignDialog({
  enquiry,
  onClose,
}: {
  enquiry: Pick<EnquiryRow, 'id' | 'reference_number' | 'assigned_user_id'>
  onClose: () => void
}) {
  const { user } = useAuth()
  const isSuper = user?.role === 'super_administrator'
  const staff = useStaff(isSuper)
  const [value, setValue] = useState(enquiry.assigned_user_id ?? '')
  const [confirm, setConfirm] = useState(false)
  const m = useEnquiryMutation(
    (uid: string | null) => svc.assign(enquiry.id, uid),
    'Assignment updated',
    onClose,
  )
  return (
    <>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Confirm reassignment?"
        description={`${enquiry.reference_number} is already assigned. This changes its owner.`}
        confirmLabel="Reassign"
        onConfirm={() => m.mutate(value || null)}
      />
      <FormDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={enquiry.assigned_user_id ? 'Reassign enquiry' : 'Assign enquiry'}
        description="Choose the lead owner. Select Unassigned to clear the owner."
        formId="enq-assign"
        submitLabel="Save"
        busy={m.isPending}
      >
        <form
          id="enq-assign"
          onSubmit={(e) => {
            e.preventDefault()
            const c = checkAssignment(enquiry.assigned_user_id, value || null, true)
            if (c === 'confirm') setConfirm(true)
            else if (c === 'ok') m.mutate(value || null)
            else onClose()
          }}
        >
          <FormField
            label="Owner"
            hint={isSuper ? undefined : 'The staff list is only available to super administrators.'}
          >
            <Select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isSuper && staff.isPending}
            >
              <option value="">Unassigned</option>
              {user && <option value={user.id}>Me ({user.name})</option>}
              {staff.data
                ?.filter((s) => s.id !== user?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.email})
                  </option>
                ))}
            </Select>
          </FormField>
        </form>
      </FormDialog>
    </>
  )
}

function StatusDialog({ enquiry, onClose }: { enquiry: EnquiryRow; onClose: () => void }) {
  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status)
  const [priority, setPriority] = useState<Priority>(enquiry.priority as Priority)
  const m = useEnquiryMutation(
    (v: { status?: EnquiryStatus; priority?: Priority }) => svc.update(enquiry.id, v),
    'Enquiry updated',
    onClose,
  )
  const changed = status !== enquiry.status || priority !== enquiry.priority
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Update status / priority"
      description="Only changed fields are sent. The backend validates the change."
      formId="enq-status"
      submitLabel="Update"
      busy={m.isPending || !changed}
    >
      <form
        id="enq-status"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          m.mutate({
            status: status !== enquiry.status ? status : undefined,
            priority: priority !== enquiry.priority ? priority : undefined,
          })
        }}
      >
        <FormField label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as EnquiryStatus)}>
            {ENQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
        </FormField>
      </form>
    </FormDialog>
  )
}

export function FollowUpDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const f = useForm<FollowUpForm>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { note: '', due: '' },
  })
  const m = useEnquiryMutation(
    (v: FollowUpForm) =>
      svc.addFollowUp(id, {
        note: v.note,
        due_at: v.due ? new Date(`${v.due}T00:00:00`).toISOString() : undefined,
      }),
    'Saved',
    onClose,
  )
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add note / follow-up"
      description="Internal record. With a due date it is a follow-up task; without one it is a communication note."
      formId="enq-followup"
      submitLabel="Save"
      busy={m.isPending}
    >
      <form id="enq-followup" className="space-y-4" onSubmit={f.handleSubmit((v) => m.mutate(v))}>
        <FormField label="Note" error={f.formState.errors.note?.message}>
          <textarea className={textarea} {...f.register('note')} />
        </FormField>
        <FormField label="Due date (optional)" error={f.formState.errors.due?.message}>
          <DatePicker {...f.register('due')} />
        </FormField>
      </form>
    </FormDialog>
  )
}

/** Local datetime-local value -> ISO instant. */
const iso = (v: string) => new Date(v).toISOString()

/** Backend requires staff to attest that real calendar availability was checked; nothing is booked by this UI itself. */
function MeetingConfirmDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const f = useForm<MeetingConfirmForm>({
    resolver: zodResolver(meetingConfirmSchema),
    defaultValues: { start: '', end: '', calendar_checked: false, note: '' },
  })
  const m = useEnquiryMutation(
    (v: MeetingConfirmForm) =>
      svc.confirmMeeting(id, {
        start: iso(v.start),
        end: iso(v.end),
        calendar_checked: true,
        note: v.note || undefined,
      }),
    'Meeting confirmed by the backend',
    onClose,
  )
  const e = f.formState.errors
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Confirm meeting"
      description="Confirm only after checking real calendar availability. Times are in your local time zone."
      formId="enq-meeting-confirm"
      submitLabel="Confirm meeting"
      busy={m.isPending}
    >
      <form
        id="enq-meeting-confirm"
        className="space-y-4"
        onSubmit={f.handleSubmit((v) => m.mutate(v))}
      >
        <FormField label="Start" error={e.start?.message}>
          <input
            type="datetime-local"
            className={textarea.replace('min-h-24 ', '')}
            {...f.register('start')}
          />
        </FormField>
        <FormField label="End" error={e.end?.message}>
          <input
            type="datetime-local"
            className={textarea.replace('min-h-24 ', '')}
            {...f.register('end')}
          />
        </FormField>
        <FormField label="Note (optional)" error={e.note?.message}>
          <textarea className={textarea} {...f.register('note')} />
        </FormField>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" {...f.register('calendar_checked')} />
          <span>I have checked calendar availability for this time.</span>
        </label>
        {e.calendar_checked && (
          <p role="alert" className="text-xs text-rose-700">
            {e.calendar_checked.message}
          </p>
        )}
      </form>
    </FormDialog>
  )
}

function MeetingReasonDialog({
  id,
  action,
  onClose,
}: {
  id: string
  action: 'decline' | 'cancel'
  onClose: () => void
}) {
  const f = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })
  const m = useEnquiryMutation(
    (v: ReasonForm) => svc.closeMeeting(id, action, v.reason),
    action === 'decline' ? 'Meeting declined' : 'Meeting cancelled',
    onClose,
  )
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={action === 'decline' ? 'Decline meeting request' : 'Cancel meeting'}
      description="The reason is recorded by the backend. Whether the requester is notified depends on the backend and is not confirmed here."
      formId="enq-meeting-reason"
      submitLabel={action === 'decline' ? 'Decline' : 'Cancel meeting'}
      busy={m.isPending}
    >
      <form
        id="enq-meeting-reason"
        className="space-y-4"
        onSubmit={f.handleSubmit((v) => m.mutate(v))}
      >
        <FormField label="Reason" error={f.formState.errors.reason?.message}>
          <textarea className={textarea} {...f.register('reason')} />
        </FormField>
      </form>
    </FormDialog>
  )
}
