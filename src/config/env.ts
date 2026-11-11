export const env = {
  /** Public backend base URL (VITE_API_BASE_URL). The only env var the app needs. */
  apiBaseUrl: ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, ''),
}

/** Dev-server only: login form prefill from VITE_DEV_* in .env.development.local (gitignored). Never set in production. */
export const devLogin = (who: 'ADMIN' | 'PARTNER') =>
  import.meta.env.DEV
    ? {
        email: import.meta.env[`VITE_DEV_${who}_EMAIL`] as string | undefined,
        password: import.meta.env[`VITE_DEV_${who}_PASSWORD`] as string | undefined,
      }
    : undefined
