import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas'
import { authService } from '@/features/auth/services/authService'
import { toAppError } from '@/services/api/errors'
import { PARTNER_ROUTES } from '../config/routes'

/** POST /auth/invitations/accept {token, password}. The token comes from the emailed link (?token=). */
export default function PartnerActivatePage() {
  // Keep the token in memory only and drop it from the address bar/history (never logged).
  const params = useSearchParams()[0]
  const [token] = useState(() => params.get('token') ?? '')
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (window.location.search) navigate(PARTNER_ROUTES.activate, { replace: true })
  }, [navigate])
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })
  const { errors } = form.formState
  const m = useMutation({ mutationFn: authService.acceptInvitation })

  if (m.isSuccess) {
    return (
      <>
        <p role="status">Your account is active. You can now sign in.</p>
        <Link
          to={PARTNER_ROUTES.login}
          className="mt-4 inline-block text-sm text-coral-ink hover:underline"
        >
          Partner sign in
        </Link>
      </>
    )
  }
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-coral-ink">Partner Portal</p>
      <h1 className="text-xl font-bold">Activate your account</h1>
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((v) => m.mutate({ token, password: v.password }))}
      >
        <FormField label="Password" error={errors.password?.message}>
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            {...form.register('password')}
          />
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passwords
        </label>
        {!token && (
          <p role="alert" className="text-sm text-rose-800">
            This activation link is missing its token. Use the link from your invitation email.
          </p>
        )}
        {m.error && (
          <p role="alert" className="text-sm text-rose-800">
            {toAppError(m.error).message}
            {toAppError(m.error).status === 400 &&
              ' This link may be invalid, expired or already used. If you have already activated your account, sign in; otherwise ask your Coral Swift administrator to send a new invitation.'}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={m.isPending || !token}>
          {m.isPending ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </>
  )
}
