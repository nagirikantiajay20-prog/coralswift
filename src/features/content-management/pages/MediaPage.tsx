import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { mediaEndpoints as e } from '@/config/endpoints'
import { pageCount } from '@/features/partner-applications/utils/format'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

const SIZE = 12
const MAX = 10 * 1024 * 1024
interface Media {
  id: string
  original_filename: string
  file_size: number
  alt_text: string | null
  is_public: boolean
}
interface List {
  data: Media[] | null
  meta?: Record<string, unknown> | null
}

/** Authenticated preview: the file endpoint needs the bearer token, so a plain <img src> cannot be used. */
function Thumb({ m }: { m: Media }) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let url: string | undefined
    let live = true
    api
      .get<Blob>(e.file(m.id), { responseType: 'blob' })
      .then((r) => {
        if (live) setSrc((url = URL.createObjectURL(r.data)))
      })
      .catch(() => undefined)
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [m.id])
  return src ? (
    <img
      src={src}
      alt={m.alt_text ?? m.original_filename}
      className="h-32 w-full rounded object-cover"
    />
  ) : (
    <div className="h-32 w-full rounded bg-muted" aria-hidden />
  )
}

export default function MediaPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [alt, setAlt] = useState('')
  const [err, setErr] = useState<string>()
  const file = useRef<HTMLInputElement>(null)

  const list = useQuery({
    queryKey: ['cms', 'media', page, q],
    queryFn: async () => {
      const { data } = await api.get<List>(e.list, {
        params: { page, page_size: SIZE, archived: false, q: q || undefined },
      })
      return { rows: data.data ?? [], pages: pageCount(data.meta ?? null, page, SIZE, (data.data ?? []).length) }
    },
    placeholderData: (prev) => prev,
  })
  const done = () => qc.invalidateQueries({ queryKey: ['cms', 'media'] })
  const upload = useMutation({
    mutationFn: (f: File) => {
      const form = new FormData()
      form.append('file', f)
      if (alt.trim()) form.append('alt_text', alt.trim())
      return api.post(e.list, form)
    },
    onSuccess: () => {
      setAlt('')
      if (file.current) file.current.value = ''
      done()
    },
    onError: (x) => setErr(toAppError(x).message),
  })
  const act = useMutation({
    mutationFn: ({ id, a }: { id: string; a: 'publish' | 'unpublish' | 'archive' }) =>
      api.post(e.action(id, a)),
    onSuccess: done,
    onError: (x) => setErr(toAppError(x).message),
  })

  const pick = (f?: File) => {
    setErr(undefined)
    if (!f) return
    if (!/^image\/(png|jpeg)$/.test(f.type)) return setErr('Only PNG or JPG images are allowed.')
    if (f.size > MAX) return setErr('The file is larger than 10 MiB.')
    upload.mutate(f)
  }

  return (
    <>
      <PageHeader title="Media library" description="Images are private until published." />
      <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <Input
          aria-label="Alt text"
          placeholder="Alt text (optional)"
          value={alt}
          onChange={(ev) => setAlt(ev.target.value)}
          className="max-w-xs"
        />
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg"
          aria-label="Upload image"
          onChange={(ev) => pick(ev.target.files?.[0])}
          disabled={upload.isPending}
        />
        <Input
          aria-label="Search media"
          placeholder="Search"
          value={q}
          onChange={(ev) => {
            setQ(ev.target.value)
            setPage(1)
          }}
          className="ml-auto max-w-xs"
        />
      </Card>
      {err && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {err}
        </p>
      )}
      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={toAppError(list.error).message} onRetry={() => list.refetch()} />
      ) : !list.data?.rows.length ? (
        <EmptyState title="No media yet" description="Upload a PNG or JPG to get started." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.data.rows.map((m) => (
              <Card key={m.id} className="space-y-2 p-3">
                <Thumb m={m} />
                <p className="truncate text-sm font-medium" title={m.original_filename}>
                  {m.original_filename}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <StatusBadge label={m.is_public ? 'Published' : 'Private'} tone={m.is_public ? 'success' : 'neutral'} />
                  <span>{Math.ceil(m.file_size / 1024)} KB</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: m.id, a: m.is_public ? 'unpublish' : 'publish' })}
                  >
                    {m.is_public ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: m.id, a: 'archive' })}
                  >
                    Archive
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageCount={list.data.pages} onChange={setPage} />
        </>
      )}
    </>
  )
}
