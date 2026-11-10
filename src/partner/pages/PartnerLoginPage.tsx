import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { MfaEnroll, MfaVerify } from '@/features/auth/pages/LoginPage'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { authService } from '@/features/auth/services/authService'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { PARTNER_ROUTES } from '../config/routes'
import { partnerAuthService } from '../services/partnerAuthService'
import { partnerDestination } from '../utils/destination'

export default function PartnerLoginPage() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: { pathname?: string; search?: string } } | null)
    ?.from
  const mfaStep = useAuthStore((s) => s.mfaStep)
  const expired = useAuthStore((s) => s.sessionExpired)
  const signedIn = useAuthStore((s) => !!s.partner)
  const [show, setShow] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const { errors } = form.formState

  /** After each stage: load the session unless an MFA step is still pending. */
  const finish = async () => {
    setLoadError(null)
    if (useAuthStore.getState().mfaStep) return
    try {
      await partnerAuthService.loadSession()
      navigate(partnerDestination(from), { replace: true })
    } catch (e) {
      setLoadError(e)
    }
  }
  const afterMfa = async () => {
    const s = useAuthStore.getState()
    s.setTokens(s.accessToken ?? '', s.refreshToken ?? '', null)
    await finish()
  }
  const login = useMutation({ mutationFn: authService.login, onSuccess: finish })

  if (signedIn && !mfaStep) return <Navigate to={partnerDestination(from)} replace />
  if (mfaStep === 'verify') return <MfaVerify onDone={afterMfa} />
  if (mfaStep === 'enroll') return <MfaEnroll onDone={afterMfa} />

  const error = login.error ?? loadError
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-coral-ink">Partner Portal</p>
      <h1 className="text-xl font-bold">Partner sign in</h1>
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
        <div>
          <Label htmlFor="partner-password">Password</Label>
          <div className="relative">
            <Input
              id="partner-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'partner-password-error' : undefined}
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
            <p id="partner-password-error" role="alert" className="mt-1 text-xs text-rose-800">
              {errors.password.message}
            </p>
          )}
        </div>
        {error != null && (
          <p role="alert" className="text-sm text-rose-800">
            {toAppError(error).message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <Link
        to={PARTNER_ROUTES.forgotPassword}
        className="mt-4 inline-block text-sm text-coral-ink hover:underline"
      >
        Forgot password?
      </Link>
      <p className="mt-4 text-xs text-muted">
        Partner accounts are created by invitation after your application is approved. Use the
        activation link in your invitation email to set your password before signing in.
      </p>
    </>
  )
}
