import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'

/** Password input with a show/hide toggle. Place inside FormField (id/aria props reach the input). */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-navy"
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}

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
