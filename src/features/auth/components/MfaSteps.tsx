import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toAppError } from '@/services/api/errors'
import { authService } from '../services/authService'

export const ErrorText = ({ error }: { error: unknown }) =>
  error ? (
    <p role="alert" className="text-sm text-rose-800">
      {toAppError(error).message}
    </p>
  ) : null

function CodeInput(props: {
  onSubmit: (code: string) => void
  pending: boolean
  error: unknown
  label: string
  submitLabel: string
}) {
  const [code, setCode] = useState('')
  const valid = /^\d{6}$/.test(code)
  return (
    <form
      className="mt-4 space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) props.onSubmit(code)
      }}
    >
      <FormField label={props.label} error={code && !valid ? 'Enter the 6-digit code' : undefined}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </FormField>
      <ErrorText error={props.error} />
      <Button type="submit" className="w-full" disabled={props.pending || !valid}>
        {props.pending ? 'Checking…' : props.submitLabel}
      </Button>
    </form>
  )
}

export function MfaVerify({ onDone }: { onDone: () => void }) {
  const verify = useMutation({
    mutationFn: (code: string) => authService.verifyMfa({ code }),
    onSuccess: onDone,
  })
  return (
    <>
      <h1 className="text-xl font-bold">Two-step verification</h1>
      <p className="mt-2 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
      <CodeInput
        label="Authentication code"
        submitLabel="Verify"
        pending={verify.isPending}
        error={verify.error}
        onSubmit={verify.mutate}
      />
    </>
  )
}

export function MfaEnroll({ onDone }: { onDone: () => void }) {
  const enroll = useMutation({ mutationFn: authService.enrollMfa })
  const confirm = useMutation({ mutationFn: authService.confirmMfa })
  const codes = confirm.data?.recovery_codes

  if (codes) {
    return (
      <>
        <h1 className="text-xl font-bold">Save your recovery codes</h1>
        <p className="mt-2 text-sm text-muted">
          Each code works once. They are shown only now: store them somewhere safe.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-surface p-3 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button className="mt-4 w-full" onClick={onDone}>
          I have saved them, continue
        </Button>
      </>
    )
  }
  return (
    <>
      <h1 className="text-xl font-bold">Set up two-step verification</h1>
      <p className="mt-2 text-sm text-muted">This account requires an authenticator app (TOTP).</p>
      {enroll.data ? (
        <>
          <p className="mt-3 text-sm">Add this key to your authenticator app, then enter a code:</p>
          <p className="mt-1 break-all rounded-md bg-surface p-3 font-mono text-sm">
            {enroll.data.secret}
          </p>
          <CodeInput
            label="First authentication code"
            submitLabel="Confirm"
            pending={confirm.isPending}
            error={confirm.error}
            onSubmit={confirm.mutate}
          />
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <ErrorText error={enroll.error} />
          <Button className="w-full" disabled={enroll.isPending} onClick={() => enroll.mutate()}>
            {enroll.isPending ? 'Preparing…' : 'Start setup'}
          </Button>
        </div>
      )}
    </>
  )
}
