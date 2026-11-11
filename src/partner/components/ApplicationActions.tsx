import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Select } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import {
  partnerDashboardService as s,
  type PartnerApplication,
} from '../services/partnerDashboardService'
import { Async, errText, human, Panel } from './Panel'

/** Backend EngagementPathway enum (openapi.json). */
export const PATHWAYS = [
  'strategic_merger_integration',
  'direct_project_engagement',
  'vendor_subcontracting',
] as const
const MAX_NOTE = 4000
/** Stages before a decision. The backend still has the final say (409 is shown as-is). */
const WITHDRAWABLE = [
  'draft',
  'submitted',
  'eligibility_verification',
  'capability_review',
  'commercial_legal_review',
  'information_requested',
]

/** Which lifecycle actions the UI offers; mirrors the endpoint descriptions in the OpenAPI spec. */
export function applicationActions(a: Pick<PartnerApplication, 'status' | 'open_information_requests'>) {
  return {
    edit: a.status === 'draft',
    submit: a.status === 'draft',
    // "Resubmit after answering every information request"
    resubmit: a.status === 'information_requested' && a.open_information_requests === 0,
    withdraw: WITHDRAWABLE.includes(a.status),
  }
}

const field =
  'w-full rounded-md border border-line bg-white p-2 text-sm aria-[invalid=true]:border-rose'

/** Draft editing, readiness, submit / resubmit / withdraw for the partner's own application. */
export function ApplicationActions({ app }: { app: PartnerApplication }) {
  const pid = useAuthStore((st) => st.partner?.id)
  const qc = useQueryClient()
  const can = applicationActions(app)
  const [pathway, setPathway] = useState(app.pathway ?? '')
  const [cover, setCover] = useState(app.cover_note ?? '')
  const [withdrawing, setWithdrawing] = useState(false)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string>()

  const readiness = useQuery({
    queryKey: ['partner', pid, 'readiness', app.id],
    queryFn: () => s.readiness(app.id),
    enabled: !!pid && can.submit,
    retry: 1,
  })
  const done = (msg: string) => {
    toast.success(msg)
    void qc.invalidateQueries({ queryKey: ['partner', pid] })
  }
  const fail = (e: unknown) => toast.error(errText(e))
  const save = useMutation({
    mutationFn: () =>
      s.updateDraft(app.id, {
        pathway: pathway || undefined,
        cover_note: cover.trim() || undefined,
      }),
    onSuccess: () => done('Draft saved'),
    onError: fail,
  })
  const submit = useMutation({
    mutationFn: () => s.submit(app.id),
    onSuccess: () => done('Application submitted'),
    onError: fail,
  })
  const resubmit = useMutation({
    mutationFn: () => s.resubmit(app.id),
    onSuccess: () => done('Application resubmitted'),
    onError: fail,
  })
  const withdraw = useMutation({
    mutationFn: () => s.withdraw(app.id, note.trim() || undefined),
    onSuccess: () => {
      setWithdrawing(false)
      done('Application withdrawn')
    },
    onError: fail,
  })

  if (!can.edit && !can.resubmit && !can.withdraw) return null
  const r = readiness.data
  const notReady = can.submit && r != null && !r.complete

  const onSave = () => {
    if (cover.length > MAX_NOTE) return setFormError(`Maximum ${MAX_NOTE} characters`)
    setFormError(undefined)
    save.mutate()
  }

  return (
    <Panel title="Your application">
      {can.edit && (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="font-medium">Partner pathway</span>
            <Select value={pathway} onChange={(e) => setPathway(e.target.value)}>
              {PATHWAYS.map((p) => (
                <option key={p} value={p}>
                  {human(p)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="font-medium">Cover note (optional)</span>
            <textarea
              className={`${field} min-h-24`}
              value={cover}
              aria-invalid={!!formError}
              onChange={(e) => setCover(e.target.value)}
            />
            {formError && (
              <span role="alert" className="text-xs text-rose-800">
                {formError}
              </span>
            )}
          </label>
          <Button variant="secondary" size="sm" disabled={save.isPending} onClick={onSave}>
            {save.isPending ? 'Saving…' : 'Save draft'}
          </Button>

          <div aria-label="Submission readiness">
            <p className="font-medium">Before you can submit</p>
            <Async q={readiness}>
              {r?.complete ? (
                <p className="text-emerald-800">Your profile and required documents are complete.</p>
              ) : (
                <ul className="list-disc pl-5 text-muted">
                  {r?.missing_profile_fields.map((f) => (
                    <li key={`f-${f}`}>Profile: {human(f)}</li>
                  ))}
                  {r?.missing_document_categories.map((c) => (
                    <li key={`d-${c}`}>Document: {human(c)}</li>
                  ))}
                </ul>
              )}
            </Async>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {can.submit && (
          <Button disabled={submit.isPending || notReady || readiness.isLoading} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Submitting…' : 'Submit for review'}
          </Button>
        )}
        {can.resubmit && (
          <Button disabled={resubmit.isPending} onClick={() => resubmit.mutate()}>
            {resubmit.isPending ? 'Resubmitting…' : 'Resubmit after information requests'}
          </Button>
        )}
        {can.withdraw && (
          <Button variant="danger" onClick={() => setWithdrawing(true)}>
            Withdraw application
          </Button>
        )}
      </div>
      <Dialog open={withdrawing} onOpenChange={setWithdrawing}>
        <DialogContent
          title="Withdraw this application?"
          description="The review team will be told you withdrew. Contact us if you want to apply again."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Keep application</Button>
              </DialogClose>
              <Button
                variant="danger"
                disabled={withdraw.isPending || note.length > MAX_NOTE}
                onClick={() => withdraw.mutate()}
              >
                {withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            </>
          }
        >
          <label className="block text-sm">
            <span className="font-medium">Reason (optional)</span>
            <textarea
              className={`${field} min-h-20`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
