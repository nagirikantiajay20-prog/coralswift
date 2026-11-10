import { isAxiosError } from 'axios'
import type { AppError } from '@/types/common'

export class NotConfiguredError extends Error {
  constructor(what: string) {
    super(`${what} is not configured: backend API specification is pending.`)
    this.name = 'NotConfiguredError'
  }
}

/**
 * Backend errors: `{ success:false, message, error:{ code, details[] } }`; FastAPI 422s may instead
 * be `{ detail: [{ msg }] }`.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof NotConfiguredError) return { message: error.message, code: 'NOT_CONFIGURED' }
  if (isAxiosError(error)) {
    if (!error.response) {
      return { message: 'Cannot reach the server. Check your connection.', code: 'NETWORK' }
    }
    const data = error.response.data as
      { message?: unknown; error?: { code?: unknown }; detail?: unknown } | undefined
    const detail = Array.isArray(data?.detail)
      ? (data.detail[0] as { msg?: unknown } | undefined)?.msg
      : undefined
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof detail === 'string'
          ? detail
          : error.response.status === 429
            ? 'Too many attempts. Please wait and try again.'
            : error.message
    const code = typeof data?.error?.code === 'string' ? data.error.code : undefined
    return { message, status: error.response.status, code }
  }
  return { message: error instanceof Error ? error.message : 'Something went wrong.' }
}
