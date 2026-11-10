import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const field =
  'h-10 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted disabled:opacity-50 aria-[invalid=true]:border-rose'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />
}

/** Native select styled to match; keeps full keyboard/screen-reader support. */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, className)} {...props} />
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium', className)} {...props} />
}
