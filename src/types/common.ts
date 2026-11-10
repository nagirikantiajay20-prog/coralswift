/** Normalised error shape used across the UI. Backend error format is pending documentation. */
export interface AppError {
  message: string
  status?: number
  code?: string
}
