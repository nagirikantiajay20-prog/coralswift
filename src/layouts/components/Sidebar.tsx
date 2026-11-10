import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import logo from '@/assets/coralswift-logo.png'
import { NAVIGATION, type NavGroup, type NavItem } from '@/config/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

const linkClass =
  (collapsed: boolean, nested: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md border-l-2 py-2 text-sm transition-colors',
      nested ? 'pl-9 pr-3' : 'px-3',
      collapsed && 'justify-center px-0',
      isActive
        ? 'border-coral-bright bg-warm font-medium'
        : 'border-transparent text-navy-soft hover:bg-surface',
    )

function Item({
  item,
  collapsed,
  nested,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  nested?: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.to}
        end
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={linkClass(collapsed, !!nested && !collapsed)}
      >
        {(!nested || collapsed) && <Icon className="size-4 shrink-0" aria-hidden />}
        <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
      </NavLink>
    </li>
  )
}

function Group({
  group,
  collapsed,
  onNavigate,
}: {
  group: NavGroup
  collapsed: boolean
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const hasActive = group.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
  const [open, setOpen] = useState(hasActive)
  const Icon = group.icon!
  const expanded = open || hasActive
  const id = `nav-${group.label!.replace(/\W+/g, '-').toLowerCase()}`

  // Collapsed rail: every item as an icon, no group header.
  if (collapsed)
    return (
      <ul className="mb-2 border-t border-line pt-2">
        {group.items.map((i) => (
          <Item key={i.to} item={i} collapsed onNavigate={onNavigate} />
        ))}
      </ul>
    )

  return (
    <div className="mb-1">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setOpen(!expanded)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface"
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn('size-4 text-muted transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>
      {expanded && (
        <ul id={id}>
          {group.items.map((i) => (
            <Item key={i.to} item={i} collapsed={false} nested onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
}) {
  const { can } = useAuth()
  // Hide unauthorized items, then drop groups left empty.
  const groups = NAVIGATION.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.module)),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <img
          src={logo}
          alt="CoralSwift Technologies"
          className={cn('h-10 w-auto', collapsed && 'hidden')}
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mx-auto rounded p-1.5 hover:bg-surface"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>
        )}
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((g, i) =>
          g.label ? (
            <Group key={g.label} group={g} collapsed={collapsed} onNavigate={onNavigate} />
          ) : (
            <ul key={i} className="mb-2">
              {g.items.map((it) => (
                <Item key={it.to} item={it} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </ul>
          ),
        )}
      </nav>
    </div>
  )
}
