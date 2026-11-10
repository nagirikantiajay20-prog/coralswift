import * as Menu from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuLabel = Menu.Label
export const DropdownMenuSeparator = (p: ComponentProps<typeof Menu.Separator>) => (
  <Menu.Separator className="my-1 h-px bg-line" {...p} />
)

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align="end"
        sideOffset={6}
        className={cn(
          'z-50 min-w-56 rounded-md border border-line bg-white p-1 shadow-lg',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface',
        className,
      )}
      {...props}
    />
  )
}
