import { canAccessWith, type ModuleKey } from '@/config/permissions'
import { ROUTES } from '@/config/routes'
import { useAuthStore } from '@/store/authStore'
import type { SessionKind } from '@/types/auth'
import { homeFor } from '../utils/destination'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const partner = useAuthStore((s) => s.partner)
  const paths = useAuthStore((s) => s.permittedPaths)
  const kind: SessionKind | null = user ? 'staff' : partner ? 'partner' : null
  return {
    user,
    kind,
    /** Where "home" is for this session (login when signed out). */
    home: kind ? homeFor(kind) : ROUTES.login,
    can: (module: ModuleKey) => canAccessWith(user?.role, module, paths),
  }
}
