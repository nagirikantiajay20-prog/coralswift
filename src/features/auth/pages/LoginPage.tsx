import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { PasswordInput } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { devLogin } from '@/config/env'
import { ROUTES } from '@/config/routes'
import { useAuthStore } from '@/store/authStore'
import { ErrorText, MfaEnroll, MfaVerify } from '../components/MfaSteps'
import { useAuth } from '../hooks/useAuth'
import { loginSchema, type LoginValues } from '../schemas'
import { authService } from '../services/authService'
import { resolveDestination } from '../utils/destination'

function CredentialsForm({ onDone }: { onDone: () => void }) {
  const expired = useAuthStore((s) => s.sessionExpired)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: devLogin('ADMIN'),
  })
  const { errors } = form.formState
  const login = useMutation({ mutationFn: authService.login, onSuccess: onDone })

  return (
    <>
      <h1 className="text-xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use your CoralSwift account.</p>
      {expired && (
        <p role="status" className="mt-3 text-sm text-muted">
          Your session expired. Please sign in again.
        </p>
      )}
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
      >
        <FormField label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="username" {...form.register('email')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...form.register('password')} />
        </FormField>
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

/**
 * The one login for every portal. The user never picks a portal or role: after the credential (and
 * MFA) steps, the backend's /auth/me decides staff vs partner and the destination follows.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: { pathname?: string; search?: string } } | null)
    ?.from
  const mfaStep = useAuthStore((s) => s.mfaStep)
  const { kind } = useAuth()
  const [loadError, setLoadError] = useState<unknown>(null)

  /** After each auth stage: loads the session unless an MFA step is still pending. */
  const finish = async () => {
    setLoadError(null)
    if (useAuthStore.getState().mfaStep) return
    try {
      const sessionKind = await authService.completeSession()
      navigate(resolveDestination(sessionKind, from), { replace: true })
    } catch (e) {
      setLoadError(e)
    }
  }
  const afterMfa = async () => {
    const s = useAuthStore.getState()
    s.setTokens(s.accessToken ?? '', s.refreshToken ?? '', null)
    await finish()
  }

  if (kind && !mfaStep) return <Navigate to={resolveDestination(kind, from)} replace />
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
