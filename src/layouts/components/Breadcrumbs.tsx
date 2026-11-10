import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION } from '@/config/navigation'

const labelByPath = new Map(NAVIGATION.flatMap((g) => g.items).map((i) => [i.to, i.label]))
const humanize = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function useCrumbs() {
  const segments = useLocation().pathname.split('/').filter(Boolean).slice(1) // drop "admin"
  return segments.map((seg, i) => {
    const to = '/admin/' + segments.slice(0, i + 1).join('/')
    return { to, label: labelByPath.get(to) ?? humanize(seg) }
  })
}

export function Breadcrumbs() {
  const crumbs = useCrumbs()
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-xs text-muted">
        <li>
          <Link to="/admin/dashboard" className="hover:underline">
            Admin
          </Link>
        </li>
        {crumbs.map((c, i) => (
          <li key={c.to} className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-navy">
                {c.label}
              </span>
            ) : (
              <Link to={c.to} className="hover:underline">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
