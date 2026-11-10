import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
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
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  )
}
