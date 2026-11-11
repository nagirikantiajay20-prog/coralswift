import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/config/routes'
import { toAppError } from '@/services/api/errors'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'
import { authService } from '../services/authService'

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })
  const m = useMutation({ mutationFn: authService.forgotPassword })

  return (
    <>
      <h1 className="text-xl font-bold">Forgot password</h1>
      {m.isSuccess ? (
        <p role="status" className="mt-4 text-sm">
          If an account exists for that email, reset instructions will be sent.
        </p>
      ) : (
        <form
          className="mt-5 space-y-4"
          noValidate
          onSubmit={form.handleSubmit((v) => m.mutate(v))}
        >
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="username" {...form.register('email')} />
          </FormField>
          {m.error && (
            <p role="alert" className="text-sm text-rose-800">
              {toAppError(m.error).message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={m.isPending}>
            Send reset link
          </Button>
        </form>
      )}
      <Link to={ROUTES.login} className="mt-4 inline-block text-sm text-coral-ink hover:underline">
        Back to sign in
      </Link>
    </>
  )
}
