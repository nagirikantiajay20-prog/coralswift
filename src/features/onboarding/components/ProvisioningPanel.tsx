import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAppMutation } from '@/features/partner-applications/hooks/useApplications'
import type { ReviewDetail } from '@/features/partner-applications/types'
import { inviteSchema, type InviteForm } from '../schemas'
import { onboardingService } from '../services/onboardingService'
import { contactPrefill, provisioningBlockers } from '../utils/derive'

/**
 * Partner account provisioning = POST /reviewer/invitations (invitation-only; the invitee sets
 * their own password via /auth/invitations/accept, so no password is ever generated or shown).
 * The backend offers no endpoint to read invitation/account state, so success is shown only for
 * this session and nothing is persisted locally. Duplicate prevention is the backend's (409).
 */
export function ProvisioningPanel({ detail }: { detail: ReviewDetail }) {
  const { user } = useAuth()
  const [confirm, setConfirm] = useState<InviteForm | null>(null)
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const f = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: contactPrefill(detail.organization.authorized_contacts),
  })
  const m = useAppMutation(
    (v: InviteForm) =>
      onboardingService.invitePartner({ ...v, organization_id: detail.organization.id }),
    'Invitation accepted by the backend',
    () => setSentAt(new Date()),
  )

  if (user?.role !== 'super_administrator')
    return (
      <p className="text-sm text-muted">Only a Super Administrator can invite partner users.</p>
    )

  const blockers = provisioningBlockers(detail.application.status, detail.documents)
  const disabled = blockers.length > 0 || m.isPending || sentAt !== null
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Sends an invitation to the partner contact. They set their own password and activate the
        account; no password is created or displayed here. Provisioning is never automatic.
      </p>
      {blockers.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-amber-900" role="status">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {sentAt && (
        <p className="rounded border border-line bg-surface p-3 text-sm" role="status">
          Invitation accepted by the backend at {sentAt.toLocaleTimeString()}. Account activation
          status cannot be read (no backend endpoint), and re-sending is disabled for this session.
        </p>
      )}
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={f.handleSubmit((v) => setConfirm(v))}
        noValidate
      >
        <FormField label="Contact full name" error={f.formState.errors.full_name?.message}>
          <Input autoComplete="off" disabled={disabled} {...f.register('full_name')} />
        </FormField>
        <FormField label="Contact email" error={f.formState.errors.email?.message}>
          <Input type="email" autoComplete="off" disabled={disabled} {...f.register('email')} />
        </FormField>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={disabled}>
            {m.isPending ? 'Sending…' : 'Invite partner user'}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Provision partner account?"
        description={`Invite ${confirm?.full_name ?? ''} (${confirm?.email ?? ''}) to the Partner Portal for ${detail.organization.legal_name}. This sends an invitation email and cannot be undone from here.`}
        confirmLabel="Send invitation"
        onConfirm={() => confirm && m.mutate(confirm)}
      />
    </div>
  )
}
