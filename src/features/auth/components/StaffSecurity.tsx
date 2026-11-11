import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { partnerSettingsService as s } from '@/partner/services/partnerSettingsService'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

/** Own sessions (GET/DELETE /auth/sessions) and recovery-code replacement (POST /auth/mfa/recovery-codes). */
export function StaffSecurity() {
  const uid = useAuthStore((st) => st.user?.id)
  const qc = useQueryClient()
  const key = ['staff', uid, 'sessions']
  const q = useQuery({ queryKey: key, queryFn: s.sessions, enabled: !!uid, retry: 1 })
  const [target, setTarget] = useState<string | null>(null)
  const [askAll, setAskAll] = useState(false)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: key })
  const revoke = useMutation({
    mutationFn: s.revokeSession,
    onSuccess: () => (toast.success('Session signed out.'), refresh()),
    onError: (e) => toast.error(toAppError(e).message),
  })
  const revokeAll = useMutation({
    mutationFn: s.revokeOtherSessions,
    onSuccess: () => (toast.success('All other sessions signed out.'), refresh()),
    onError: (e) => toast.error(toAppError(e).message),
  })
  const regen = useMutation({
    mutationFn: () => s.regenerateRecoveryCodes(code.trim()),
    onSuccess: (r) => (setCodes(r.recovery_codes), setCode('')),
    onError: (e) => toast.error(toAppError(e).message),
  })
  const rows = q.data ?? []

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {q.isPending ? (
            <LoadingState label="Loading sessions…" />
          ) : q.isError ? (
            <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
          ) : !rows.length ? (
            <EmptyState title="No sessions" />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
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
                    <Button size="sm" variant="secondary" onClick={() => setTarget(r.id)}>
                      Sign out
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {rows.some((r) => !r.current) && (
            <Button className="mt-3" variant="secondary" onClick={() => setAskAll(true)}>
              Sign out all other sessions
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery codes</CardTitle>
        </CardHeader>
        <CardContent>
          {codes ? (
            <>
              <p className="text-sm text-muted">
                Each code works once and is shown only now. Old codes no longer work.
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-surface p-3 font-mono text-sm">
                {codes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          ) : (
            <form
              className="max-w-xs space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                regen.mutate()
              }}
            >
              <Label htmlFor="staff-mfa-code">Current authenticator code</Label>
              <Input
                id="staff-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" disabled={!/^\d{6}$/.test(code.trim()) || regen.isPending}>
                Replace recovery codes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={askAll}
        onOpenChange={setAskAll}
        title="Sign out all other sessions?"
        description="Every other device will need to sign in again."
        confirmLabel="Sign out all"
        destructive
        onConfirm={() => revokeAll.mutate()}
      />
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Sign out this session?"
        description="That device will need to sign in again."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => target && revoke.mutate(target)}
      />
    </div>
  )
}
