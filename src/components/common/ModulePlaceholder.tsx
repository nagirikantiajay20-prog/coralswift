import { Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from './PageHeader'

/**
 * Honest scaffold page: marks a module as NOT implemented and lists PRD capabilities
 * to be built once the backend API specification is available.
 */
export function ModulePlaceholder({
  title,
  description,
  capabilities,
  note = 'Scaffold only. Implementation is pending the Coral Swift backend API specification.',
}: {
  title: string
  description: string
  capabilities: string[]
  note?: string
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Construction className="size-5 text-coral-ink" aria-hidden />
          <CardTitle>Not implemented yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted">{note} Planned capabilities (per PRD):</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
