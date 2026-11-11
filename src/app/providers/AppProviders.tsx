import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { authService } from '@/features/auth/services/authService'
import { configureApiAuth } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'

// Wire the API client to the auth store once, at module load.
configureApiAuth({
  getToken: () => useAuthStore.getState().accessToken,
  refresh: authService.refresh,
  onUnauthorized: () => useAuthStore.getState().expire(),
})

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
  )
  useEffect(() => {
    void authService.restore() // reload persistence: refresh token -> session
  }, [])
  // Never let one identity's cached API data outlive its session (logout, expiry, user switch).
  useEffect(
    () =>
      useAuthStore.subscribe((s, prev) => {
        const id = (x: typeof s) => x.user?.id ?? x.partner?.id ?? null
        if (!s.accessToken || id(s) !== id(prev)) client.clear()
      }),
    [client],
  )
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  )
}
