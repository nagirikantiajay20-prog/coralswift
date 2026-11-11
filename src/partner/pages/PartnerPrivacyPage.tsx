import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { Async, human, Panel, when } from '../components/Panel'
import { partnerSettingsService as s, type PrivacyKind } from '../services/partnerSettingsService'

const KINDS: Record<PrivacyKind, string> = {
  access: 'Access my account information',
  correction: 'Correct my account information',
  deletion: 'Close my account / delete my data',
}

/**
 * POST/GET /partner/privacy-requests (authenticated; identity comes from the session). The request
 * goes to Coral Swift staff; nothing is deleted or exported by the frontend, and legal/audit
 * retention is applied by staff.
 */
export default function PartnerPrivacyPage() {
  const email = useAuthStore((st) => st.partner?.email) ?? ''
  const [kind, setKind] = useState<PrivacyKind>('access')
  const [details, setDetails] = useState('')
  const [ask, setAsk] = useState(false)
  const pid = useAuthStore((st) => st.partner?.id)
  const qc = useQueryClient()
  const key = ['partner', pid, 'privacy-requests']
  const list = useQuery({ queryKey: key, queryFn: s.privacyRequests, enabled: !!pid, retry: 1 })
  const m = useMutation({
    mutationFn: () => s.submitPrivacyRequest({ kind, details: details.trim() || undefined }),
    onSuccess: () => {
      setDetails('')
      void qc.invalidateQueries({ queryKey: key })
    },
  })
  const ref = m.data?.reference
  return (
    <div className="space-y-4">
      <Panel title="How we use your information">
        <p className="text-sm text-muted">
          Coral Swift uses your account and organization information to assess and manage your
          partnership. You can ask to access, correct or close your records. Requests are reviewed
          by our team; completion, and any legal or audit retention, is decided by them.
        </p>
      </Panel>
      <Panel title="Submit a request">
        <form
          className="max-w-lg space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (kind === 'deletion') setAsk(true)
            else m.mutate()
          }}
        >
          <div>
            <Label htmlFor="pr-email">Account email</Label>
            <Input id="pr-email" value={email} readOnly />
          </div>
          <div>
            <Label htmlFor="pr-kind">Request type</Label>
            <Select
              id="pr-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as PrivacyKind)}
            >
              {Object.entries(KINDS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="pr-details">Details (optional)</Label>
            <textarea
              id="pr-details"
              rows={4}
              maxLength={2000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full rounded-md border border-line bg-white p-3 text-sm"
            />
          </div>
          {m.error != null && (
            <p role="alert" className="text-sm text-rose-800">
              {toAppError(m.error).message}
            </p>
          )}
          {m.isSuccess && (
            <p role="status" className="text-sm text-emerald-800">
              Request received{ref ? `. Reference: ${ref}` : ''}. You can follow its status below.
            </p>
          )}
          <Button type="submit" disabled={!email || m.isPending}>
            {m.isPending ? 'Submitting…' : 'Submit request'}
          </Button>
        </form>
      </Panel>
      <Panel title="Your requests">
        <Async q={list}>
          {!(list.data ?? []).length ? (
            <p className="text-sm text-muted">You have not submitted any requests.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(list.data ?? []).map((r) => (
                <li key={r.reference} className="py-2">
                  <p className="font-medium">
                    {KINDS[r.kind] ?? human(r.kind)} · {human(r.status)}
                  </p>
                  <p className="text-muted">
                    {r.reference} · {when(r.created_at)}
                  </p>
                  {r.resolution_note && <p className="mt-1">{r.resolution_note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Async>
      </Panel>
      <ConfirmDialog
        open={ask}
        onOpenChange={setAsk}
        title="Submit account closure request?"
        description="This asks Coral Swift to review closing your account and deleting your data. Nothing is deleted immediately; records we must retain by law or audit rules are kept."
        confirmLabel="Submit request"
        destructive
        onConfirm={() => m.mutate()}
      />
    </div>
  )
}
