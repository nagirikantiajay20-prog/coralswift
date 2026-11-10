import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toAppError } from '@/services/api/errors'
import { changePasswordSchema, type ChangePasswordValues } from '../schemas'
import { authService } from '../services/authService'

export default function ChangePasswordPage() {
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) })
  const { errors } = form.formState
  const m = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      toast.success('Password changed')
      form.reset()
    },
    onError: (e) => toast.error(toAppError(e).message),
  })

  return (
    <>
      <PageHeader title="Change password" />
      <Card className="max-w-md">
        <CardContent>
          <form className="space-y-4" noValidate onSubmit={form.handleSubmit((v) => m.mutate(v))}>
            <FormField label="Current password" error={errors.currentPassword?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                {...form.register('currentPassword')}
              />
            </FormField>
            <FormField label="New password" error={errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...form.register('password')} />
            </FormField>
            <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                {...form.register('confirmPassword')}
              />
            </FormField>
            <Button type="submit" disabled={m.isPending}>
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
