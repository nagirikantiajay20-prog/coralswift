import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/config/routes'
import { toAppError } from '@/services/api/errors'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas'
import { authService } from '../services/authService'

export default function ResetPasswordPage({ loginRoute = ROUTES.login }: { loginRoute?: string }) {
  // ponytail: reset token read from `?token=`; the emailed link format is not in the backend spec.
  const token = useSearchParams()[0].get('token') ?? ''
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })
  const { errors } = form.formState
  const m = useMutation({ mutationFn: authService.resetPassword })

  if (m.isSuccess) {
    return (
      <>
        <p role="status">Your password has been reset.</p>
        <Link to={loginRoute} className="mt-4 inline-block text-sm text-coral-ink hover:underline">
          Sign in
        </Link>
      </>
    )
  }
  return (
    <>
      <h1 className="text-xl font-bold">Reset password</h1>
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((v) => m.mutate({ password: v.password, token }))}
      >
        <FormField label="New password" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
        </FormField>
        {!token && (
          <p role="alert" className="text-sm text-rose-800">
            This reset link is missing its token.
          </p>
        )}
        {m.error && (
          <p role="alert" className="text-sm text-rose-800">
            {toAppError(m.error).message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={m.isPending || !token}>
          Reset password
        </Button>
      </form>
    </>
  )
}
