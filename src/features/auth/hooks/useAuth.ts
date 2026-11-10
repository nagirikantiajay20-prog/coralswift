import { canAccess, type ModuleKey } from '@/config/permissions'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  return { user, can: (module: ModuleKey) => canAccess(user?.role, module) }
}
