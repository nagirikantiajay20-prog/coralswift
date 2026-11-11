import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { partnerEndpoints } from '../config/endpoints'
import {
  SERVICE_CATEGORIES,
  type EditableField,
  type Organization,
  type ProfileChanges,
} from '../services/partnerProfileService'
import {
  buildChanges,
  humanCategory,
  label,
  SECTIONS,
  type Draft,
  type SectionKey,
} from '../utils/profileFields'

const TEXTAREAS = [
  'business_description',
  'technical_capabilities',
  'infrastructure_summary',
  'registered_address',
]
const NUMBERS = ['year_established', 'employee_count', 'annual_turnover_inr_crore']
const area =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm aria-[invalid=true]:border-rose'

const LIST_KEYS: Record<string, string[]> = {
  client_references: ['name', 'organization', 'contact'],
  authorized_contacts: ['name', 'designation', 'email', 'phone'],
}
const LIST_MAX: Record<string, number> = { client_references: 10, authorized_contacts: 10 }

/** Form-friendly copy of the saved values: numbers as strings, nulls as '' / []. */
const toDraft = (org: Organization, section: SectionKey): Draft =>
  Object.fromEntries(
    SECTIONS[section].fields.map((f) => {
      const v = (org as unknown as Draft)[f]
      const isList = f === 'service_categories' || f in LIST_KEYS
      return [f, v == null ? (isList ? [] : '') : typeof v === 'number' ? String(v) : v]
    }),
  )

function View({ org, section }: { org: Organization; section: SectionKey }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {SECTIONS[section].fields.map((f) => {
        const v = (org as unknown as Draft)[f]
        let body: React.ReactNode = <span className="text-muted">Not provided</span>
        if (Array.isArray(v) && v.length) {
          body =
            f === 'service_categories' ? (
              (v as string[]).map(humanCategory).join(', ')
            ) : (
              <ul className="space-y-1">
                {(v as Record<string, string>[]).map((r, i) => (
                  <li key={i}>{Object.values(r).join(' · ')}</li>
                ))}
              </ul>
            )
        } else if (typeof v === 'string' && v) body = v
        else if (typeof v === 'number') body = v
        return (
          <div key={f} className={TEXTAREAS.includes(f) || Array.isArray(v) ? 'sm:col-span-2' : ''}>
            <dt className="text-muted">{label(f)}</dt>
            <dd className="whitespace-pre-wrap break-words font-medium">{body}</dd>
          </div>
        )
      })}
    </dl>
  )
}

function ListEditor({
  field,
  keys,
  rows,
  max,
  onChange,
  error,
}: {
  field: string
  keys: string[]
  rows: Record<string, string>[]
  max: number
  onChange: (rows: Record<string, string>[]) => void
  error?: string
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">{label(field)}</legend>
      {rows.map((r, i) => (
        <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[repeat(4,1fr)_auto]">
          {keys.map((k) => (
            <Input
              key={k}
              aria-label={`${label(field)} ${i + 1} ${k}`}
              placeholder={k.replace(/^./, (c) => c.toUpperCase())}
              value={r[k] ?? ''}
              onChange={(e) =>
                onChange(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={rows.length >= max}
        onClick={() => onChange([...rows, Object.fromEntries(keys.map((k) => [k, '']))])}
      >
        Add {label(field).toLowerCase().replace(/s$/, '')}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-800">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export function ProfileSection({
  section,
  org,
  focused,
  onSave,
  onRequest,
  saving,
  requesting,
}: {
  section: SectionKey
  org: Organization
  focused?: boolean
  onSave: (changes: ProfileChanges) => Promise<unknown>
  onRequest: (changes: ProfileChanges, reason: string) => Promise<unknown>
  saving: boolean
  requesting: boolean
}) {
  // `focused` (from a completion link) mounts this section already in edit mode.
  const [editing, setEditing] = useState(!!focused)
  const [draft, setDraft] = useState<Draft>(() => (focused ? toDraft(org, section) : {}))
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const busy = saving || requesting
  const pid = useAuthStore((st) => st.partner?.id)
  const rules = useQuery({
    queryKey: ['partner', pid, 'editable-fields'],
    queryFn: async () =>
      (await api.get<{ data: EditableField[] | null }>(partnerEndpoints.editableFields)).data
        .data ?? [],
    enabled: !!pid && editing,
    staleTime: 300_000,
    retry: false,
  })
  const direct = SECTIONS[section].fields.filter((f) =>
    rules.data?.some((r) => r.name === f && r.direct_update),
  )
  const approval = SECTIONS[section].fields.filter((f) =>
    rules.data?.some((r) => r.name === f && r.approval_required),
  )
  const initial = toDraft(org, section)
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(initial)

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const start = () => {
    setDraft(initial)
    setErrors({})
    setMsg(null)
    setReason('')
    setEditing(true)
  }
  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return
    setEditing(false)
    setErrors({})
  }
  const run = async (mode: 'save' | 'request') => {
    if (busy) return
    const { changes, errors: errs } = buildChanges(section, draft, initial)
    if (mode === 'request' && !reason.trim()) errs.reason = 'A reason is required'
    if (!Object.keys(changes).length && !Object.keys(errs).length)
      errs.form = 'No changes to submit'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      if (mode === 'save') await onSave(changes)
      else await onRequest(changes, reason.trim())
      setMsg({
        ok: true,
        text:
          mode === 'save'
            ? 'Changes saved.'
            : 'Change request submitted for staff review. Your profile is unchanged until it is approved.',
      })
      setEditing(false)
    } catch (e) {
      const err = toAppError(e)
      setMsg({
        ok: false,
        text:
          err.status === 409
            ? 'This profile was changed elsewhere. It has been reloaded; review it and try again.'
            : err.status === 403
              ? 'You are not allowed to make this change.'
              : err.message,
      })
    }
  }
  const set = (f: string, v: unknown) => setDraft((d) => ({ ...d, [f]: v }))

  return (
    <Card id={`section-${section}`} aria-label={SECTIONS[section].title}>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>{SECTIONS[section].title}</CardTitle>
        {!editing && (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Edit ${SECTIONS[section].title}`}
            onClick={start}
          >
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={msg.ok ? 'text-sm text-emerald-800' : 'text-sm text-rose-800'}
          >
            {msg.text}
          </p>
        )}
        {!editing ? (
          <View org={org} section={section} />
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void run('save')
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {SECTIONS[section].fields.map((f) => {
                if (LIST_KEYS[f])
                  return (
                    <ListEditor
                      key={f}
                      field={f}
                      keys={LIST_KEYS[f]}
                      max={LIST_MAX[f]}
                      rows={(draft[f] as Record<string, string>[]) ?? []}
                      onChange={(r) => set(f, r)}
                      error={errors[f]}
                    />
                  )
                if (f === 'service_categories')
                  return (
                    <fieldset key={f} className="sm:col-span-2">
                      <legend className="mb-1.5 text-sm font-medium">{label(f)}</legend>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {SERVICE_CATEGORIES.map((c) => {
                          const cur = (draft[f] as string[]) ?? []
                          return (
                            <label key={c} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={cur.includes(c)}
                                onChange={(e) =>
                                  set(
                                    f,
                                    e.target.checked ? [...cur, c] : cur.filter((x) => x !== c),
                                  )
                                }
                              />
                              {humanCategory(c)}
                            </label>
                          )
                        })}
                      </div>
                      {errors[f] && (
                        <p role="alert" className="mt-1 text-xs text-rose-800">
                          {errors[f]}
                        </p>
                      )}
                    </fieldset>
                  )
                const common = {
                  value: String(draft[f] ?? ''),
                  onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
                    set(f, e.target.value),
                }
                return (
                  <div key={f} className={TEXTAREAS.includes(f) ? 'sm:col-span-2' : ''}>
                    <FormField label={label(f)} error={errors[f]}>
                      {TEXTAREAS.includes(f) ? (
                        <textarea rows={4} className={area} {...common} />
                      ) : (
                        <Input
                          type={NUMBERS.includes(f) ? 'number' : 'text'}
                          inputMode={NUMBERS.includes(f) ? 'decimal' : undefined}
                          {...common}
                        />
                      )}
                    </FormField>
                  </div>
                )
              })}
            </div>
            {(direct.length > 0 || approval.length > 0) && (
              <p className="text-xs text-muted">
                {direct.length > 0 && <>Saved immediately: {direct.map(label).join(', ')}. </>}
                {approval.length > 0 && (
                  <>Needs staff approval: {approval.map(label).join(', ')}.</>
                )}
              </p>
            )}
            <FormField
              label="Reason for change (required to submit for staff approval)"
              error={errors.reason}
            >
              <textarea
                rows={2}
                className={area}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormField>
            {errors.form && (
              <p role="alert" className="text-sm text-rose-800">
                {errors.form}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void run('request')}
              >
                {requesting ? 'Submitting…' : 'Submit for staff approval'}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
