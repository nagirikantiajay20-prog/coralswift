import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/states'
import { FormField } from '@/components/forms/FormField'
import { FileUpload } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { formatDateTime } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { ContentStatusBadge } from '../components/ContentParts'
import {
  useAttach,
  useClaims,
  useContentAction,
  useContentItem,
  useCreateContent,
  useUpdateContent,
  useVersions,
} from '../hooks/useContent'
import { CONTENT_TYPES, type AdminContent } from '../types'
import {
  actionsFor,
  CLAIM_STATUS_LABEL,
  contentFormSchema,
  EMPTY_FORM,
  formatBytes,
  isDirty,
  isEditable,
  slugify,
  toForm,
  toInput,
  toPatch,
  TYPE_LABEL,
  validateAttachment,
  validateNote,
  type ContentFormValues,
  type WorkflowAction,
} from '../utils/content'

const area =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm aria-[invalid=true]:border-rose disabled:opacity-60'

export default function ContentEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const item = useContentItem(id)
  if (!isNew && item.isPending) return <LoadingState label="Loading content…" />
  if (!isNew && item.isError) {
    return (
      <ErrorState message={toAppError(item.error).message} onRetry={() => void item.refetch()} />
    )
  }
  return <Editor key={item.data?.id ?? 'new'} item={item.data} />
}

function Editor({ item }: { item?: AdminContent }) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const create = useCreateContent()
  const update = useUpdateContent(item?.id ?? '')
  const claims = useClaims({ page: 1, page_size: 100 })
  const [preview, setPreview] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const saved = useMemo(() => (item ? toForm(item) : EMPTY_FORM), [item])
  const readOnly = !!item && !isEditable(item.status)
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: saved,
    values: saved,
  })
  const values = useWatch({ control }) as ContentFormValues
  const dirty = !readOnly && isDirty(values, saved)

  // Unsaved changes: block in-app navigation and tab close.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !(nextLocation.state as { saved?: boolean } | null)?.saved &&
      currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const onSave = handleSubmit(async (v) => {
    setServerError(null)
    try {
      if (item) {
        await update.mutateAsync(toPatch(v))
      } else {
        const created = await create.mutateAsync(toInput(v))
        navigate(`/admin/website/pages/${created.id}`, { replace: true, state: { saved: true } })
      }
    } catch (e) {
      setServerError(toAppError(e).message)
    }
  })

  const toggleClaim = (cid: string) =>
    setValue(
      'claim_ids',
      values.claim_ids.includes(cid)
        ? values.claim_ids.filter((x) => x !== cid)
        : [...values.claim_ids, cid],
      { shouldDirty: true },
    )

  return (
    <>
      <PageHeader
        title={item ? item.title : 'New content'}
        description={
          item
            ? `Version ${item.current_version} · ${TYPE_LABEL[item.content_type]}`
            : 'Creates a draft. Nothing is published until it is approved and published.'
        }
        actions={
          <>
            {item && <ContentStatusBadge status={item.status} />}
            <Button asChild variant="secondary">
              <Link to="/admin/website/pages">Back to list</Link>
            </Button>
          </>
        }
      />
      {item?.review_note && (
        <p role="note" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Review note: {item.review_note}
        </p>
      )}
      {readOnly && (
        <p className="mb-4 rounded-md bg-surface p-3 text-sm text-muted">
          Only drafts can be edited. Reopen the item as a draft to change it.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <form onSubmit={onSave} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Title" error={errors.title?.message}>
                  <Input
                    disabled={readOnly}
                    {...register('title', {
                      onChange: (e) => {
                        if (!item && !getValues('slug')) setValue('slug', slugify(e.target.value))
                      },
                    })}
                  />
                </FormField>
                <FormField
                  label="Slug"
                  error={errors.slug?.message}
                  hint={item ? 'The slug cannot be changed after creation.' : 'Lowercase, hyphens.'}
                >
                  <Input disabled={!!item} {...register('slug')} />
                </FormField>
                <FormField label="Content type" error={errors.content_type?.message}>
                  <Select disabled={!!item} {...register('content_type')}>
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Category" error={errors.category?.message}>
                  <Input disabled={readOnly} {...register('category')} />
                </FormField>
              </div>
              <FormField
                label="Summary"
                error={errors.summary?.message}
                hint="Up to 500 characters."
              >
                <textarea rows={2} className={area} disabled={readOnly} {...register('summary')} />
              </FormField>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">Body</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview((p) => !p)}
                  >
                    {preview ? 'Edit' : 'Preview'}
                  </Button>
                </div>
                {preview ? (
                  <div
                    aria-label="Body preview"
                    className="min-h-40 whitespace-pre-wrap rounded-md border border-line bg-surface p-3 text-sm"
                  >
                    {/* Plain text only: body format is not specified by the API, so nothing is rendered as HTML. */}
                    {values.body || 'Nothing to preview.'}
                  </div>
                ) : (
                  <FormField
                    label="Body text"
                    error={errors.body?.message}
                    hint="Plain text, up to 100,000 characters."
                  >
                    <textarea
                      rows={14}
                      className={area}
                      disabled={readOnly}
                      {...register('body')}
                    />
                  </FormField>
                )}
              </div>
              <FormField
                label="Tags"
                error={errors.tags?.message as string | undefined}
                hint="Comma-separated: lowercase letters, numbers, hyphens. Max 15."
              >
                <Input disabled={readOnly} {...register('tags')} />
              </FormField>
              <fieldset disabled={readOnly}>
                <legend className="mb-1.5 text-sm font-medium">Linked public claims</legend>
                {claims.isPending ? (
                  <p className="text-sm text-muted">Loading claims…</p>
                ) : claims.isError ? (
                  <p className="text-sm text-rose-800">{toAppError(claims.error).message}</p>
                ) : claims.data.rows.length === 0 ? (
                  <p className="text-sm text-muted">No claims registered.</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-auto text-sm">
                    {claims.data.rows.map((c) => (
                      <li key={c.id}>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={values.claim_ids.includes(c.id)}
                            onChange={() => toggleClaim(c.id)}
                          />
                          <span>
                            {c.claim_text}{' '}
                            <span className="text-xs text-muted">
                              ({CLAIM_STATUS_LABEL[c.evidence_status]})
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {errors.claim_ids?.message && (
                  <p role="alert" className="text-xs text-rose-800">
                    {errors.claim_ids.message}
                  </p>
                )}
              </fieldset>
              {serverError && (
                <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">
                  {serverError}
                </p>
              )}
              {!readOnly && (
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={create.isPending || update.isPending || (!!item && !dirty)}
                  >
                    {item ? 'Save draft' : 'Create draft'}
                  </Button>
                  {dirty && <span className="text-sm text-amber-900">Unsaved changes</span>}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        {item && (
          <div className="space-y-6">
            <WorkflowPanel item={item} blocked={dirty} role={role} />
            <AttachmentPanel item={item} />
            <VersionsPanel id={item.id} />
          </div>
        )}
      </div>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(o) => !o && blocker.state === 'blocked' && blocker.reset()}
        title="Discard unsaved changes?"
        description="You have edits that have not been saved to the server. Leaving now discards them."
        confirmLabel="Discard and leave"
        destructive
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </>
  )
}

function WorkflowPanel({
  item,
  blocked,
  role,
}: {
  item: AdminContent
  blocked: boolean
  role: Parameters<typeof actionsFor>[1]
}) {
  const run = useContentAction(item.id)
  const [pending, setPending] = useState<WorkflowAction | null>(null)
  const [note, setNote] = useState('')
  const noteError = pending ? validateNote(pending, note) : null
  const actions = actionsFor(item.status, role)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-muted">Status</dt>
          <dd>
            <ContentStatusBadge status={item.status} />
          </dd>
          <dt className="text-muted">Published</dt>
          <dd>{formatDateTime(item.published_at)}</dd>
          <dt className="text-muted">Last reviewed</dt>
          <dd>{formatDateTime(item.last_reviewed_at)}</dd>
        </dl>
        {blocked && (
          <p className="text-xs text-amber-900">Save your changes before changing status.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant={a.destructive ? 'secondary' : 'primary'}
              disabled={blocked || run.isPending}
              onClick={() => {
                setNote('')
                setPending(a)
              }}
            >
              {a.label}
            </Button>
          ))}
          {actions.length === 0 && (
            <p className="text-muted">No actions available for this status.</p>
          )}
        </div>
        <p className="text-xs text-muted">
          Every action is validated by the server. Scheduling is not supported by the backend.
        </p>
      </CardContent>
      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        {pending && (
          <DialogContent
            title={`${pending.label}?`}
            description={pending.confirm}
            footer={
              <>
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <Button
                  variant={pending.destructive ? 'danger' : 'primary'}
                  disabled={!!noteError || run.isPending}
                  onClick={() =>
                    run.mutate(
                      { action: pending.action, note: note.trim() || undefined },
                      { onSuccess: () => setPending(null) },
                    )
                  }
                >
                  {pending.label}
                </Button>
              </>
            }
          >
            {pending.note && (
              <div className="p-5">
                <FormField
                  label={pending.note === 'required' ? 'Note (required)' : 'Note (optional)'}
                  error={note ? (noteError ?? undefined) : undefined}
                >
                  <textarea
                    rows={3}
                    className={area}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </FormField>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </Card>
  )
}

function AttachmentPanel({ item }: { item: AdminContent }) {
  const attach = useAttach(item.id)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const a = item.attachment
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {a ? (
          <p>
            {a.filename} · {formatBytes(a.size)}
            {a.version_label ? ` · ${a.version_label}` : ''}
          </p>
        ) : (
          <p className="text-muted">No attachment.</p>
        )}
        {isEditable(item.status) ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const err = validateAttachment(file, label)
              setError(err)
              if (!err && file) {
                attach.mutate(
                  { file, label: label.trim() || undefined },
                  {
                    onSuccess: () => {
                      setFile(null)
                      setLabel('')
                    },
                  },
                )
              }
            }}
          >
            <FormField
              label="File"
              error={error ?? undefined}
              hint="Type and size limits are enforced by the server."
            >
              <FileUpload onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </FormField>
            <FormField label="Version label (optional)">
              <Input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
            </FormField>
            <Button type="submit" size="sm" disabled={attach.isPending}>
              {a ? 'Replace attachment' : 'Upload attachment'}
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted">
            Attachments can only be changed while the item is a draft.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function VersionsPanel({ id }: { id: string }) {
  const v = useVersions(id)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version history</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {v.isPending ? (
          <LoadingState />
        ) : v.isError ? (
          <ErrorState message={toAppError(v.error).message} onRetry={() => void v.refetch()} />
        ) : v.data.length === 0 ? (
          <p className="text-muted">No versions.</p>
        ) : (
          <ol className="space-y-2">
            {[...v.data]
              .sort((a, b) => b.version_no - a.version_no)
              .map((x) => (
                <li key={x.version_no} className="rounded-md bg-surface p-2">
                  <p className="font-medium">
                    v{x.version_no} · {x.title}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(x.created_at)} · editor {x.edited_by.slice(0, 8)}
                  </p>
                </li>
              ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
