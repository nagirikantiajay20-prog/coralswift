import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { checkAssignment } from '@/features/lead-assignment/utils/assignment'
import {
  DECISION_STATUSES,
  docReviewSchema,
  eligibilitySchema,
  type EligibilityForm,
  infoRequestSchema,
  noteSchema,
  transitionSchema,
  type DocReviewForm,
  type InfoRequestForm,
  type NoteForm,
  type TransitionForm,
} from '../schemas'
import { useAppMutation, useReviewers } from '../hooks/useApplications'
import { partnerApplicationsService as svc } from '../services/partnerApplicationsService'
import {
  DOC_CATEGORIES,
  REVIEW_STATUSES,
  VERIFICATION_OUTCOMES,
  type ApplicationDocument,
  type PortalStatus,
  type ReviewerApplication,
} from '../types'
import { humanize, REVIEWER_TARGETS } from '../utils/format'

const textarea =
  'min-h-24 w-full rounded-md border border-line bg-white p-3 text-sm aria-[invalid=true]:border-rose'

/** Dialog shell with a submit button wired to a form `id`; closes via the `open` prop. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel,
  busy,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  formId: string
  submitLabel: string
  busy: boolean
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" form={formId} disabled={busy}>
              {busy ? 'Saving…' : submitLabel}
            </Button>
          </>
        }
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

type Kind = 'assign' | 'note' | 'info' | 'stage' | 'elig'

/** Rejected/withdrawn applications are final: the backend documents no reversal process. */
export const isFinal = (s: PortalStatus) => s === 'rejected' || s === 'withdrawn'

/**
 * Review actions. Role gating here is UX only (the backend authorizes every call and its
 * errors are shown verbatim). Assignment needs the reviewer list, which only super
 * administrators can read (GET /admin/users), so it is offered to them alone.
 */
export function ReviewActions({ app }: { app: ReviewerApplication }) {
  const { user, can } = useAuth()
  const [open, setOpen] = useState<Kind | null>(null)
  if (!can('applicationReviews') || !user) return null
  const close = () => setOpen(null)
  const btn = (k: Kind, label: string) => (
    <Button variant="secondary" size="sm" onClick={() => setOpen(k)}>
      {label}
    </Button>
  )
  return (
    <div className="flex flex-wrap gap-2">
      {user.role === 'super_administrator' && btn('assign', 'Assign reviewer')}
      {btn('note', 'Add internal note')}
      {btn('info', 'Request information')}
      {btn('elig', 'Record eligibility')}
      {!isFinal(app.status) && btn('stage', 'Record decision / change stage')}
      {open === 'assign' && (
        <AssignDialog id={app.id} current={app.assigned_reviewer_id} onClose={close} />
      )}
      {open === 'note' && <NoteDialog id={app.id} onClose={close} />}
      {open === 'info' && <InfoDialog id={app.id} onClose={close} />}
      {open === 'elig' && <EligibilityDialog app={app} onClose={close} />}
      {open === 'stage' && <StageDialog app={app} onClose={close} />}
    </div>
  )
}

/** Shared by the review workspace and Lead Assignment. Reassigning asks for confirmation. */
export function AssignDialog({
  id,
  current,
  onClose,
}: {
  id: string
  current: string | null
  onClose: () => void
}) {
  const reviewers = useReviewers(true)
  const [value, setValue] = useState(current ?? '')
  const [confirm, setConfirm] = useState(false)
  const m = useAppMutation((rid: string) => svc.assign(id, rid), 'Reviewer assigned', onClose)
  return (
    <>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Confirm reassignment?"
        description="This application is already assigned. This changes its reviewer."
        confirmLabel="Reassign"
        onConfirm={() => m.mutate(value)}
      />
      <FormDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title="Assign reviewer"
        description="Choose a Partner Reviewer to own this application."
        formId="assign-form"
        submitLabel="Assign"
        busy={m.isPending}
      >
        <form
          id="assign-form"
          onSubmit={(e) => {
            e.preventDefault()
            const c = checkAssignment(current, value || null, false)
            if (c === 'confirm') setConfirm(true)
            else if (c === 'ok') m.mutate(value)
          }}
        >
          {reviewers.isError ? (
            <p role="alert" className="text-sm text-rose-800">
              Could not load reviewers (super administrator access is required).
            </p>
          ) : (
            <FormField
              label="Reviewer"
              error={!value && m.isError ? 'Choose a reviewer' : undefined}
            >
              <Select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={reviewers.isPending}
              >
                <option value="">{reviewers.isPending ? 'Loading…' : 'Select a reviewer'}</option>
                {reviewers.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} ({r.email})
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </form>
      </FormDialog>
    </>
  )
}

export function NoteDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const f = useForm<NoteForm>({ resolver: zodResolver(noteSchema), defaultValues: { body: '' } })
  const m = useAppMutation((v: NoteForm) => svc.addNote(id, v.body), 'Note added', onClose)
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add internal note"
      description="Internal only: never visible to the partner."
      formId="note-form"
      submitLabel="Add note"
      busy={m.isPending}
    >
      <form id="note-form" onSubmit={f.handleSubmit((v) => m.mutate(v))}>
        <FormField label="Note" error={f.formState.errors.body?.message}>
          <textarea className={textarea} {...f.register('body')} />
        </FormField>
      </form>
    </FormDialog>
  )
}

function InfoDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const f = useForm<InfoRequestForm>({
    resolver: zodResolver(infoRequestSchema),
    defaultValues: { body: '', requested_categories: [] },
  })
  const m = useAppMutation(
    (v: InfoRequestForm) => svc.requestInfo(id, v),
    'Information request sent',
    onClose,
  )
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Request additional information"
      description="The partner sees this message and the application moves to Information requested."
      formId="info-form"
      submitLabel="Send request"
      busy={m.isPending}
    >
      <form id="info-form" className="space-y-4" onSubmit={f.handleSubmit((v) => m.mutate(v))}>
        <FormField label="Message to partner" error={f.formState.errors.body?.message}>
          <textarea className={textarea} {...f.register('body')} />
        </FormField>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Documents requested (optional)</legend>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {DOC_CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={c} {...f.register('requested_categories')} />
                {humanize(c)}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </FormDialog>
  )
}

function EligibilityDialog({ app, onClose }: { app: ReviewerApplication; onClose: () => void }) {
  const [pending, setPending] = useState<EligibilityForm | null>(null)
  const f = useForm<EligibilityForm>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: {
      outcome: 'verified',
      verified_operating_years: '',
      verified_personnel: '',
      verified_turnover_inr_crore: '',
      exception_note: '',
      notes: '',
    },
  })
  const num = (s: string) => (s === '' ? undefined : Number(s))
  const m = useAppMutation(
    (v: EligibilityForm) =>
      svc.recordEligibility(app.id, {
        outcome: v.outcome,
        verified_operating_years: num(v.verified_operating_years),
        verified_personnel: num(v.verified_personnel),
        verified_turnover_inr_crore: num(v.verified_turnover_inr_crore),
        exception_note: v.exception_note || undefined,
        notes: v.notes || undefined,
      }),
    'Eligibility verification recorded',
    onClose,
  )
  return (
    <>
      <FormDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title="Record eligibility verification"
        description="Values are typed from evidence. Nothing is computed, and this does not approve or reject the application."
        formId="elig-form"
        submitLabel="Review & save"
        busy={m.isPending}
      >
        <form id="elig-form" className="space-y-4" onSubmit={f.handleSubmit(setPending)}>
          <FormField label="Outcome" error={f.formState.errors.outcome?.message}>
            <Select {...f.register('outcome')}>
              {VERIFICATION_OUTCOMES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField
              label="Operating years"
              error={f.formState.errors.verified_operating_years?.message}
            >
              <Input inputMode="decimal" {...f.register('verified_operating_years')} />
            </FormField>
            <FormField label="Personnel" error={f.formState.errors.verified_personnel?.message}>
              <Input inputMode="numeric" {...f.register('verified_personnel')} />
            </FormField>
            <FormField
              label="Turnover (INR crore)"
              error={f.formState.errors.verified_turnover_inr_crore?.message}
            >
              <Input inputMode="decimal" {...f.register('verified_turnover_inr_crore')} />
            </FormField>
          </div>
          <FormField label="Exception note" error={f.formState.errors.exception_note?.message}>
            <textarea className={textarea} {...f.register('exception_note')} />
          </FormField>
          <FormField label="Notes" error={f.formState.errors.notes?.message}>
            <textarea className={textarea} {...f.register('notes')} />
          </FormField>
        </form>
      </FormDialog>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Record this verification?"
        description="It is added to the application's permanent eligibility records."
        confirmLabel="Record"
        onConfirm={() => pending && m.mutate(pending)}
      />
    </>
  )
}

function StageDialog({ app, onClose }: { app: ReviewerApplication; onClose: () => void }) {
  const [pending, setPending] = useState<TransitionForm | null>(null)
  const f = useForm<TransitionForm>({
    resolver: zodResolver(transitionSchema),
    defaultValues: { to_status: '', reason: '', partner_note: '' },
  })
  const m = useAppMutation(
    (v: TransitionForm) =>
      svc.transition(app.id, {
        to_status: v.to_status as PortalStatus,
        reason: v.reason || undefined,
        partner_note: v.partner_note || undefined,
      }),
    'Stage updated',
    onClose,
  )
  const submit = (v: TransitionForm) =>
    DECISION_STATUSES.includes(v.to_status) ? setPending(v) : m.mutate(v)
  const target = pending?.to_status as PortalStatus | undefined
  return (
    <>
      <FormDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title="Change application stage"
        description="The backend validates whether the move is permitted and returns an error if not."
        formId="stage-form"
        submitLabel="Continue"
        busy={m.isPending}
      >
        <form id="stage-form" className="space-y-4" onSubmit={f.handleSubmit(submit)}>
          <FormField label="New stage" error={f.formState.errors.to_status?.message}>
            <Select {...f.register('to_status')}>
              <option value="">Select a stage</option>
              {REVIEWER_TARGETS.filter((s) => s !== app.status).map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Internal reason"
            hint="Required for decisions (rejected, pilot onboarding, scale-up). Recorded in the history; not shown to the partner."
            error={f.formState.errors.reason?.message}
          >
            <textarea className={textarea} {...f.register('reason')} />
          </FormField>
          <FormField label="Note to partner (optional)" hint="Visible to the partner.">
            <textarea className={textarea} {...f.register('partner_note')} />
          </FormField>
        </form>
      </FormDialog>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Move to ${target ? humanize(target) : ''}?`}
        description={
          target === 'rejected'
            ? 'This rejects the application. The partner is notified through the portal.'
            : 'This records a decision on the application. It does not create a partner account: onboarding and account provisioning follow the documented backend process.'
        }
        confirmLabel="Confirm"
        destructive={target === 'rejected'}
        onConfirm={() => pending && m.mutate(pending)}
      />
    </>
  )
}

/** Per-document review (status + partner-visible comment). */
export function DocumentReviewButton({ appId, doc }: { appId: string; doc: ApplicationDocument }) {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const f = useForm<DocReviewForm>({
    resolver: zodResolver(docReviewSchema),
    defaultValues: { status: 'accepted', comment: '' },
  })
  const m = useAppMutation(
    (v: DocReviewForm) =>
      svc.reviewDocument(appId, doc.id, {
        status: v.status,
        comment: v.comment || undefined,
        version_no: doc.current_version?.version_no,
      }),
    'Document review saved',
    () => setOpen(false),
  )
  if (!can('applicationReviews') || !doc.current_version) return null
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Review
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Review: ${humanize(doc.category)}`}
        description="The comment is visible to the partner."
        formId={`doc-${doc.id}`}
        submitLabel="Save review"
        busy={m.isPending}
      >
        <form
          id={`doc-${doc.id}`}
          className="space-y-4"
          onSubmit={f.handleSubmit((v) => m.mutate(v))}
        >
          <FormField label="Outcome" error={f.formState.errors.status?.message}>
            <Select {...f.register('status')}>
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Comment" error={f.formState.errors.comment?.message}>
            <textarea className={textarea} {...f.register('comment')} />
          </FormField>
        </form>
      </FormDialog>
    </>
  )
}
