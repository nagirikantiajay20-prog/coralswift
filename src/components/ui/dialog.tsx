import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

interface ContentProps {
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  /** "center" = modal, "right"/"left" = drawer. */
  side?: 'center' | 'right' | 'left'
}

export function DialogContent({
  title,
  description,
  children,
  footer,
  side = 'center',
}: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-xl',
          side === 'center'
            ? 'left-1/2 top-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg'
            : cn('inset-y-0 w-full max-w-md', side === 'right' ? 'right-0' : 'left-0'),
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted">
              {description}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close aria-label="Close" className="rounded p-1 hover:bg-surface">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line p-4">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
