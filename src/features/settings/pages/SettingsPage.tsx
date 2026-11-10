import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toAppError } from '@/services/api/errors'
import { useSettingMutation, useSettings } from '../hooks/useSettings'
import { settingSchema, type SettingForm } from '../schemas'
import { settingsService } from '../services/settingsService'
import type { SettingItem } from '../types'
import { displayValue, filterSettings } from '../utils/settings'

function EditDialog({ item, onClose }: { item: SettingItem | null; onClose: () => void }) {
  const [proposed, setProposed] = useState<string | null>(null)
  const f = useForm<SettingForm>({
    resolver: zodResolver(settingSchema),
    // Sensitive values are never prefilled.
    values: { value: item && !item.sensitive ? (item.value ?? '') : '' },
  })
  const close = () => {
    setProposed(null)
    onClose()
  }
  const m = useSettingMutation(
    (v: { key: string; value: string }) => settingsService.put(v.key, v.value),
    'Setting saved',
    close,
  )
  if (!item) return null
  const reviewing = proposed !== null
  return (
    <Dialog open onOpenChange={(o) => !o && !m.isPending && close()}>
      <DialogContent
        title={`${item.stored ? 'Edit' : 'Set'} ${item.key}`}
        description="System-wide setting. The change takes effect for everyone once the backend accepts it."
        footer={
          reviewing ? (
            <>
              <Button variant="secondary" disabled={m.isPending} onClick={() => setProposed(null)}>
                Back
              </Button>
              <Button
                disabled={m.isPending}
                onClick={() => m.mutate({ key: item.key, value: proposed })}
              >
                {m.isPending ? 'Saving…' : 'Confirm and save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" form="setting-form">
                Review change
              </Button>
            </>
          )
        }
      >
        {reviewing ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">Current value</dt>
              <dd className="break-all font-medium">{displayValue(item)}</dd>
            </div>
            <div>
              <dt className="text-muted">Proposed value</dt>
              <dd className="break-all font-medium">
                {item.sensitive ? '•••••••• (hidden)' : proposed}
              </dd>
            </div>
          </dl>
        ) : (
          <form
            id="setting-form"
            noValidate
            className="space-y-4"
            onSubmit={f.handleSubmit((v) => setProposed(v.value))}
          >
            <p className="text-sm text-muted">Current value: {displayValue(item)}</p>
            <FormField
              label="New value"
              error={f.formState.errors.value?.message}
              hint="1 to 200 characters."
            >
              <Input
                autoComplete="off"
                type={item.sensitive ? 'password' : 'text'}
                {...f.register('value')}
              />
            </FormField>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function SettingsPage() {
  const q = useSettings()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<SettingItem | null>(null)
  const [resetting, setResetting] = useState<SettingItem | null>(null)
  const del = useSettingMutation((key: string) => settingsService.remove(key), 'Setting removed')

  const columns: Column<SettingItem>[] = [
    { header: 'Setting', cell: (i) => <code className="text-xs">{i.key}</code> },
    {
      header: 'Current value',
      cell: (i) => <span className="break-all">{displayValue(i)}</span>,
    },
    {
      header: 'Status',
      cell: (i) => (
        <span className="flex gap-1">
          <StatusBadge
            label={i.stored ? 'Stored' : 'Not set'}
            tone={i.stored ? 'success' : 'neutral'}
          />
          {i.sensitive && <StatusBadge label="Masked" tone="warning" />}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (i) => (
        <span className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            aria-label={`${i.stored ? 'Edit' : 'Set'} ${i.key}`}
            onClick={() => setEditing(i)}
          >
            <Pencil className="size-4" aria-hidden /> {i.stored ? 'Edit' : 'Set'}
          </Button>
          {i.stored && (
            <Button
              size="sm"
              variant="secondary"
              aria-label={`Remove ${i.key}`}
              disabled={del.isPending}
              onClick={() => setResetting(i)}
            >
              <RotateCcw className="size-4" aria-hidden /> Remove
            </Button>
          )}
        </span>
      ),
    },
  ]

  const err = q.isError ? toAppError(q.error) : undefined
  return (
    <>
      <PageHeader
        title="System Settings"
        description="Settings stored by the backend. Super Administrators only; the backend decides which keys can be set."
      />
      <Card>
        {q.isPending ? (
          <LoadingState label="Loading settings…" />
        ) : err || !q.data ? (
          <ErrorState
            message={
              err?.status === 403
                ? 'You do not have permission to manage system settings.'
                : (err?.message ?? 'Failed to load settings.')
            }
            onRetry={err?.status === 403 ? undefined : () => void q.refetch()}
          />
        ) : q.data.items.length === 0 ? (
          <EmptyState
            title="No settings available"
            description={
              q.data.responseKeys.length
                ? `The backend response was not recognised (fields: ${q.data.responseKeys.join(', ')}).`
                : 'The backend reports no stored or settable settings.'
            }
          />
        ) : (
          <>
            <div className="max-w-sm p-4">
              <SearchInput value={search} onChange={setSearch} label="Search settings" />
            </div>
            <DataTable
              columns={columns}
              rows={filterSettings(q.data.items, search)}
              rowKey={(i) => i.key}
              emptyTitle="No settings match your search"
            />
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Values are plain text (1–200 characters). Credential-like settings are masked and never
        prefilled. Every change is sent to the backend and re-read before being shown.
      </p>
      <EditDialog key={editing?.key ?? 'none'} item={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!resetting}
        onOpenChange={(o) => !o && setResetting(null)}
        title={`Remove ${resetting?.key ?? 'setting'}?`}
        description="The stored value is deleted and the system falls back to its default. This takes effect immediately."
        confirmLabel="Remove setting"
        destructive
        onConfirm={() => resetting && del.mutate(resetting.key)}
      />
    </>
  )
}
