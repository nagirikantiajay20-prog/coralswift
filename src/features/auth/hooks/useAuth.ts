import { canAccessWith, type ModuleKey } from '@/config/permissions'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const paths = useAuthStore((s) => s.permittedPaths)
  return { user, can: (module: ModuleKey) => canAccessWith(user?.role, module, paths) }
}
