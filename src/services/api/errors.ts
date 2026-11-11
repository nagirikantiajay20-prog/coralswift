import { isAxiosError } from 'axios'
import type { AppError } from '@/types/common'

export class NotConfiguredError extends Error {
  constructor(what: string) {
    super(`${what} is not configured: backend API specification is pending.`)
    this.name = 'NotConfiguredError'
  }
}

/** Friendly text for the distinct token / account codes (backend 2026-11-10). */
const CODE_MESSAGES: Record<string, string> = {
  TOKEN_ALREADY_USED:
    'This link has already been used. Request a new one if you still need access.',
  TOKEN_EXPIRED: 'This link has expired. Request a new one.',
  TOKEN_REVOKED: 'This link is no longer valid. Ask for a new invitation.',
  INVALID_OR_EXPIRED_TOKEN: 'This link is invalid or has expired. Request a new one.',
  ACCOUNT_DEACTIVATED: 'This account has been deactivated. Contact your administrator.',
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
      | {
          message?: unknown
          error?: { code?: unknown; details?: { message?: unknown }[] }
          detail?: unknown
        }
      | undefined
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
    const field = data?.error?.details?.[0]?.message
    const code = typeof data?.error?.code === 'string' ? data.error.code : undefined
    return {
      message:
        (code && CODE_MESSAGES[code]) ||
        (code === 'VALIDATION_ERROR' && typeof field === 'string' ? field : message),
      status: error.response.status,
      code,
    }
  }
  return { message: error instanceof Error ? error.message : 'Something went wrong.' }
}
