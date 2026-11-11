import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { devLogin } from '@/config/env'
import { ROUTES } from '@/config/routes'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { loginSchema, type LoginValues } from '../schemas'
import { authService } from '../services/authService'

const ErrorText = ({ error }: { error: unknown }) =>
  error ? (
    <p role="alert" className="text-sm text-rose-800">
      {toAppError(error).message}
    </p>
  ) : null

/** Destination to return to after sign-in (set by ProtectedRoute); only in-app paths are honoured. */
function useDestination() {
  const from = (useLocation().state as { from?: { pathname?: string; search?: string } } | null)
    ?.from
  const path = (from?.pathname ?? '') + (from?.search ?? '')
  return path.startsWith('/admin') ? path : ROUTES.dashboard
}

function CredentialsForm({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: devLogin('ADMIN'),
  })
  const { errors } = form.formState
  const login = useMutation({ mutationFn: authService.login, onSuccess: onDone })

  return (
    <>
      <h1 className="text-xl font-bold">Admin sign in</h1>
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
      >
        <FormField label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="username" {...form.register('email')} />
        </FormField>
        <div>
          <Label htmlFor="admin-password">Password</Label>
          <div className="relative">
            <Input
              id="admin-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'admin-password-error' : undefined}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-navy"
            >
              {show ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="admin-password-error" role="alert" className="mt-1 text-xs text-rose-800">
              {errors.password.message}
            </p>
          )}
        </div>
        <ErrorText error={login.error} />
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <Link
        to={ROUTES.forgotPassword}
        className="mt-4 inline-block text-sm text-coral-ink hover:underline"
      >
        Forgot password?
      </Link>
    </>
  )
}

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

export default function LoginPage() {
  const navigate = useNavigate()
  const destination = useDestination()
  const mfaStep = useAuthStore((s) => s.mfaStep)
  const [loadError, setLoadError] = useState<unknown>(null)

  /** After each auth stage: loads the session unless an MFA step is still pending. */
  const finish = async () => {
    setLoadError(null)
    if (useAuthStore.getState().mfaStep) return
    try {
      await authService.loadSession()
      navigate(destination, { replace: true })
    } catch (e) {
      setLoadError(e)
    }
  }
  const afterMfa = async () => {
    const s = useAuthStore.getState()
    s.setTokens(s.accessToken ?? '', s.refreshToken ?? '', null)
    await finish()
  }

  return (
    <>
      {mfaStep === 'verify' ? (
        <MfaVerify onDone={afterMfa} />
      ) : mfaStep === 'enroll' ? (
        <MfaEnroll onDone={afterMfa} />
      ) : (
        <CredentialsForm onDone={finish} />
      )}
      {loadError != null && (
        <div className="mt-4">
          <ErrorText error={loadError} />
        </div>
      )}
    </>
  )
}
