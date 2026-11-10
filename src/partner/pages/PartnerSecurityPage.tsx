import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { changePasswordSchema } from '@/features/auth/schemas'
import { authService } from '@/features/auth/services/authService'
import { MfaEnroll } from '@/features/auth/pages/LoginPage'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { Async, Panel, when } from '../components/Panel'
import { partnerSettingsService as s } from '../services/partnerSettingsService'

const Err = ({ e }: { e: unknown }) =>
  e ? (
    <p role="alert" className="text-sm text-rose-800">
      {toAppError(e).message}
    </p>
  ) : null

function Password() {
  const email = useAuthStore((st) => st.partner?.email)
  const [ask, setAsk] = useState(false)
  const [v, setV] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  const [invalid, setInvalid] = useState<string | null>(null)
  const reset = useMutation({
    mutationFn: () => s.sendPasswordReset(email!),
    onSuccess: () => toast.success('If the account can be reset, an email has been sent.'),
  })
  const change = useMutation({
    mutationFn: () => authService.changePassword(v),
    onSuccess: () => {
      setV({ currentPassword: '', password: '', confirmPassword: '' })
      toast.success('Password changed. Your other sessions were signed out.')
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = changePasswordSchema.safeParse(v)
    setInvalid(r.success ? null : (r.error.issues[0]?.message ?? 'Check the fields'))
    if (r.success) change.mutate()
  }
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.value })
  return (
    <Panel title="Password">
      <form onSubmit={submit} className="space-y-3" noValidate>
        {(
          [
            ['currentPassword', 'Current password', 'current-password'],
            ['password', 'New password', 'new-password'],
            ['confirmPassword', 'Confirm new password', 'new-password'],
          ] as const
        ).map(([k, label, ac]) => (
          <div key={k}>
            <Label htmlFor={`pw-${k}`}>{label}</Label>
            <Input
              id={`pw-${k}`}
              type="password"
              autoComplete={ac}
              value={v[k]}
              onChange={set(k)}
            />
          </div>
        ))}
        {invalid && (
          <p role="alert" className="text-sm text-rose-800">
            {invalid}
          </p>
        )}
        <Err e={change.error} />
        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Forgotten your password? A reset link can be emailed to your account address
        {email ? ` (${email})` : ''}. The password policy is enforced by the backend.
      </p>
      <div className="mt-2 space-y-2">
        <Err e={reset.error} />
        <Button
          variant="secondary"
          disabled={!email || reset.isPending}
          onClick={() => setAsk(true)}
        >
          {reset.isPending ? 'Sending…' : 'Email me a password reset link'}
        </Button>
      </div>
      <ConfirmDialog
        open={ask}
        onOpenChange={setAsk}
        title="Send password reset email?"
        description="A reset link will be emailed to your account address. Your current password keeps working until you complete the reset."
        confirmLabel="Send link"
        onConfirm={() => reset.mutate()}
      />
    </Panel>
  )
}

function Mfa() {
  const [mode, setMode] = useState<'idle' | 'enroll' | 'regen'>('idle')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const regen = useMutation({
    mutationFn: () => s.regenerateRecoveryCodes(code.trim()),
    onSuccess: (r) => {
      setCodes(r.recovery_codes)
      setCode('')
    },
  })
  return (
    <Panel title="Two-step verification (authenticator app)">
      <p className="text-sm text-muted">
        Status: the backend does not report whether two-step verification is on for your account. It
        offers enrollment and recovery-code replacement only; there is no endpoint to turn it off.
        Contact Coral Swift if you lose your authenticator and recovery codes.
      </p>
      {codes ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Each code works once and is shown only now. Store them safely.
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-surface p-3 font-mono text-sm">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : mode === 'enroll' ? (
        <div className="mt-3 max-w-md">
          <MfaEnroll onDone={() => setMode('idle')} />
        </div>
      ) : mode === 'regen' ? (
        <form
          className="mt-3 max-w-xs space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            regen.mutate()
          }}
        >
          <Label htmlFor="mfa-code">Current authenticator code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Err e={regen.error} />
          <Button type="submit" disabled={!code.trim() || regen.isPending}>
            Replace recovery codes
          </Button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setMode('enroll')}>Set up authenticator</Button>
          <Button variant="secondary" onClick={() => setMode('regen')}>
            Replace recovery codes
          </Button>
        </div>
      )}
    </Panel>
  )
}

function Sessions() {
  const pid = useAuthStore((st) => st.partner?.id)
  const qc = useQueryClient()
  const key = ['partner', pid, 'sessions']
  const q = useQuery({ queryKey: key, queryFn: s.sessions, enabled: !!pid, retry: 1 })
  const [target, setTarget] = useState<string | null>(null)
  const revoke = useMutation({
    mutationFn: s.revokeSession,
    onSuccess: () => {
      toast.success('Session signed out.')
      void qc.invalidateQueries({ queryKey: key })
    },
  })
  const rows = q.data ?? []
  return (
    <Panel title="Active sessions">
      <Async q={q}>
        {!rows.length ? (
          <EmptyState title="No sessions" description="No active sessions were returned." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="break-all font-medium">
                    {r.user_agent || 'Unknown device'}{' '}
                    {r.current && <span className="text-muted">(this session)</span>}
                  </p>
                  <p className="text-muted">
                    Started {when(r.created_at)} · Last active {when(r.last_used_at)}
                  </p>
                </div>
                {!r.current && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={revoke.isPending}
                    onClick={() => setTarget(r.id)}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Async>
      <Err e={revoke.error} />
      <p className="mt-3 text-xs text-muted">
        Expiry times are not returned by the backend. There is no sign-out-everywhere endpoint; sign
        out each session above. Use the header menu to sign out of this one.
      </p>
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Sign out this session?"
        description="That device will need to sign in again."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => target && revoke.mutate(target)}
      />
    </Panel>
  )
}

export default function PartnerSecurityPage() {
  return (
    <div className="space-y-4">
      <Password />
      <Mfa />
      <Sessions />
    </div>
  )
}
