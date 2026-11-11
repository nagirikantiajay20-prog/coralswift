import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { authService } from '../services/authService'

/** Revokes the server session (local state is cleared regardless), then returns to the single login. */
export function useLogout() {
  const navigate = useNavigate()
  return async () => {
    await authService.signOut()
    navigate(ROUTES.login, { replace: true })
  }
}
