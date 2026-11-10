import { ChevronDown, KeyRound, LogOut, UserCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLES } from '@/config/permissions'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { authService } from '@/features/auth/services/authService'

export function UserMenu() {
  const { user } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const logout = async () => {
    await authService.signOut() // revokes the server session; local state cleared regardless
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
          <UserAvatar name={user.name} />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm">{user.name}</span>
            <span className="block text-xs text-muted">{ROLES[user.role]}</span>
          </span>
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block text-sm text-navy">{user.name}</span>
          <span className="block text-xs font-normal text-muted">{user.email}</span>
          <span className="block text-xs font-normal text-muted">{ROLES[user.role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(ROUTES.profile)}>
          <UserCog className="size-4" aria-hidden /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(ROUTES.changePassword)}>
          <KeyRound className="size-4" aria-hidden /> Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut className="size-4" aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
