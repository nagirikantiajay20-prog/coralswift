import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { useAuth } from '../hooks/useAuth'

function Notice({
  title,
  text,
  to,
  cta,
}: {
  title: string
  text: string
  to: string
  cta: string
}) {
  return (
    <>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <Link
        to={to}
        className="mt-5 inline-block text-sm font-medium text-coral-ink hover:underline"
      >
        {cta}
      </Link>
    </>
  )
}

/** "Back" target and label follow the session: dashboard of its own portal, or sign in. */
function useBack() {
  const { kind, home } = useAuth()
  return { to: home, cta: kind ? 'Back to dashboard' : 'Sign in' }
}

export const UnauthorizedPage = () => (
  <Notice
    title="Access denied"
    text="Your role does not have access to this area."
    {...useBack()}
  />
)
export const SessionExpiredPage = () => (
  <Notice
    title="Session expired"
    text="Please sign in again to continue."
    to={ROUTES.login}
    cta="Sign in"
  />
)
export const NotFoundPage = () => (
  <Notice title="Page not found" text="The page you requested does not exist." {...useBack()} />
)
