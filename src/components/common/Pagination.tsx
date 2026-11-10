import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Page-number pagination. Switch to cursor props if the backend paginates by cursor (spec pending). */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted">
        Page {page} of {Math.max(pageCount, 1)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
