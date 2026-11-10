import type { InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'

/** Native date input: accessible and locale-aware without an extra dependency. */
export const DatePicker = (props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) => (
  <Input type="date" {...props} />
)

/**
 * File picker. Type/size restrictions must come from the backend upload policy (pending);
 * pass `accept` once known. Client checks are a convenience, never a security control.
 */
export const FileUpload = (props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) => (
  <Input
    type="file"
    className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1"
    {...props}
  />
)
