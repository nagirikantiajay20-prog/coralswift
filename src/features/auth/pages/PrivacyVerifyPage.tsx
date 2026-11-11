import { useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

/**
 * Public page: confirms the email address of a privacy request (POST /privacy/requests/verify,
 * single-use token, valid 72 hours). The token is read from `?token=`; the backend has not
 * documented the emailed link's path, so `/privacy/verify` is an assumption to confirm with them.
 * The call is made only on click, so a mail scanner or a reload cannot spend the single-use token.
 */
export default function PrivacyVerifyPage() {
  const token = useSearchParams()[0].get('token') ?? ''
  const m = useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/privacy/requests/verify', { token })
    },
  })

  if (m.isSuccess) {
    return (
      <>
        <h1 className="text-xl font-bold">Email confirmed</h1>
        <p role="status" className="mt-3 text-sm">
          Thank you. Your privacy request is now with our team, who will be in touch about it.
        </p>
      </>
    )
  }
  return (
    <>
      <h1 className="text-xl font-bold">Confirm your email address</h1>
      <p className="mt-3 text-sm text-muted">
        Confirm that you made this privacy request. We cannot start work on it until the address is
        confirmed.
      </p>
      {!token && (
        <p role="alert" className="mt-3 text-sm text-rose-800">
          This confirmation link is missing its token. Use the link from your email.
        </p>
      )}
      {m.error != null && (
        <p role="alert" className="mt-3 text-sm text-rose-800">
          {toAppError(m.error).message}
        </p>
      )}
      <Button className="mt-5 w-full" disabled={!token || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? 'Confirming…' : 'Confirm my email'}
      </Button>
    </>
  )
}
