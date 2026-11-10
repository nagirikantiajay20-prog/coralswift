export const env = {
  /** Public backend base URL (VITE_API_BASE_URL). The only env var the app needs. */
  apiBaseUrl: ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, ''),
}
