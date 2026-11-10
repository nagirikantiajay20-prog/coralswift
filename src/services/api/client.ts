import axios, { type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { NotConfiguredError } from './errors'

/** The single Axios instance. Base URL comes from VITE_API_BASE_URL only. */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { Accept: 'application/json' },
})

/**
 * Auth wiring lives outside this module to avoid an import cycle: the app registers
 * a token getter, a refresh function and a session-expired handler at startup.
 */
let auth = {
  getToken: (): string | null => null,
  /** Resolves true when a new access token was obtained. */
  refresh: (): Promise<boolean> => Promise.resolve(false),
  onUnauthorized: () => {},
}
export function configureApiAuth(opts: Partial<typeof auth>) {
  auth = { ...auth, ...opts }
}

api.interceptors.request.use((config) => {
  const token = auth.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type Retryable = InternalAxiosRequestConfig & { _retried?: boolean }
let refreshing: Promise<boolean> | null = null // single-flight: refresh tokens are one-time use

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = axios.isAxiosError(error) ? (error.config as Retryable | undefined) : undefined
    if (!cfg || error.response?.status !== 401) return Promise.reject(error)
    // Failed logins / refreshes are real answers, not expired sessions.
    if (cfg.url?.includes('/auth/login') || cfg.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }
    if (!cfg._retried && auth.getToken()) {
      cfg._retried = true
      refreshing ??= auth.refresh().finally(() => (refreshing = null))
      if (await refreshing) return api(cfg)
    }
    auth.onUnauthorized()
    return Promise.reject(error)
  },
)

/** Guard for service functions whose endpoint is not yet documented. */
export function requireEndpoint(path: string | undefined, name: string): string {
  if (!path) throw new NotConfiguredError(name)
  return path
}
