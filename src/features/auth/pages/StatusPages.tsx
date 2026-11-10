import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'

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

export const UnauthorizedPage = () => (
  <Notice
    title="Access denied"
    text="Your role does not have access to this area."
    to={ROUTES.dashboard}
    cta="Back to dashboard"
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
  <Notice
    title="Page not found"
    text="The page you requested does not exist."
    to={ROUTES.dashboard}
    cta="Back to dashboard"
  />
)
