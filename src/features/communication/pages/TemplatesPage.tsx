import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import {
  usePreview,
  useRevertTemplate,
  useSaveTemplate,
  useTemplates,
} from '../hooks/useCommunication'
import type { Template, TemplateBody } from '../types'
import { templateSchema } from '../utils/communication'

const areaCls =
  'w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-coral-ink'

function EditDialog({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const [subject, setSubject] = useState(tpl.subject ?? '')
  const [text, setText] = useState(tpl.text_body ?? '')
  const [html, setHtml] = useState(tpl.html_body ?? '')
  const [error, setError] = useState<string | null>(null)
  const save = useSaveTemplate()
  const preview = usePreview()

  const parse = (): TemplateBody | null => {
    const r = templateSchema.safeParse({ subject, text_body: text, html_body: html })
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Invalid template')
      return null
    }
    setError(null)
    return r.data
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Edit template: ${humanize(tpl.key)}`}
        description="Placeholders are validated by the backend on preview and save; none are assumed here. Previewing sends no email."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="secondary"
              disabled={preview.isPending}
              onClick={() => {
                const body = parse()
                if (body) preview.mutate({ key: tpl.key, body })
              }}
            >
              Preview
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                const body = parse()
                if (body) save.mutate({ key: tpl.key, body }, { onSuccess: onClose })
              }}
            >
              Save override
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="tpl-subject">Subject</Label>
            <Input
              id="tpl-subject"
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tpl-text">Text body</Label>
            <textarea
              id="tpl-text"
              rows={8}
              className={areaCls}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tpl-html">HTML body (optional)</Label>
            <textarea
              id="tpl-html"
              rows={5}
              className={areaCls}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose">
              {error}
            </p>
          )}
          {preview.data && (
            <div className="rounded border border-line bg-surface p-3 text-sm">
              <p className="mb-1 font-medium">Preview (sample values, shown as text)</p>
              {Object.entries(preview.data).map(([k, v]) => (
                <div key={k} className="mb-2">
                  <p className="text-xs uppercase text-muted">{k}</p>
                  <pre className="whitespace-pre-wrap break-words font-sans">{v}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TemplatesPage() {
  const q = useTemplates()
  const revert = useRevertTemplate()
  const [editing, setEditing] = useState<Template | null>(null)
  const [reverting, setReverting] = useState<Template | null>(null)

  const columns: Column<Template>[] = [
    { header: 'Template', cell: (t) => <span className="font-medium">{humanize(t.key)}</span> },
    {
      header: 'State',
      cell: (t) => (
        <StatusBadge
          label={t.customised ? 'Customised' : 'Built-in'}
          tone={t.customised ? 'info' : 'neutral'}
        />
      ),
    },
    { header: 'Version', cell: (t) => (t.customised ? (t.version ?? '—') : '—') },
    {
      header: 'Subject',
      cell: (t) => t.subject ?? <span className="text-muted">Built-in default</span>,
    },
    {
      header: 'Actions',
      cell: (t) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>
            {t.customised ? 'Edit' : 'Override'}
          </Button>
          {t.customised && (
            <Button size="sm" variant="secondary" onClick={() => setReverting(t)}>
              Revert
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Email templates"
        description="Built-in templates can be overridden and reverted. New template keys, activation toggles and version history are not supported by the backend."
      />
      <Card>
        {q.isPending ? (
          <LoadingState label="Loading templates…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={q.data}
            rowKey={(t) => t.key}
            emptyTitle="No templates"
          />
        )}
      </Card>
      {editing && <EditDialog key={editing.key} tpl={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={reverting !== null}
        onOpenChange={(o) => !o && setReverting(null)}
        title="Revert to built-in template?"
        description="The customised text is removed and the built-in template is used for future emails."
        confirmLabel="Revert"
        destructive
        onConfirm={() => reverting && revert.mutate(reverting.key)}
      />
    </>
  )
}
