import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { partnerDashboardService as s } from '../services/partnerDashboardService'
import { PATHWAYS } from './ApplicationActions'
import { errText, human, Panel } from './Panel'

const MAX_NOTE = 4000

/** Creates the partner's draft via POST /partner/applications; the page then shows the draft editor. */
export function StartApplication() {
  const pid = useAuthStore((st) => st.partner?.id)
  const qc = useQueryClient()
  const [pathway, setPathway] = useState('')
  const [cover, setCover] = useState('')
  const [error, setError] = useState<string>()

  const create = useMutation({
    mutationFn: () => s.create({ pathway, cover_note: cover.trim() || undefined }),
    onSuccess: () => {
      toast.success('Draft application created')
      void qc.invalidateQueries({ queryKey: ['partner', pid] })
    },
    onError: (e) => toast.error(errText(e)),
  })

  const onCreate = () => {
    if (!pathway) return setError('Choose a partner pathway')
    if (cover.length > MAX_NOTE) return setError(`Maximum ${MAX_NOTE} characters`)
    setError(undefined)
    create.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Application</h1>
        <p className="text-sm text-muted">
          You have no application yet. Start a draft, add documents, then submit it for review.
        </p>
      </div>
      <Panel title="Start your application">
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="font-medium">Partner pathway</span>
            <Select
              value={pathway}
              aria-invalid={!pathway && !!error}
              onChange={(e) => setPathway(e.target.value)}
            >
              <option value="">Select a pathway…</option>
              {PATHWAYS.map((p) => (
                <option key={p} value={p}>
                  {human(p)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="font-medium">Cover note (optional)</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-line bg-white p-2 text-sm"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-rose-800">
              {error}
            </p>
          )}
          <Button disabled={create.isPending} onClick={onCreate}>
            {create.isPending ? 'Creating…' : 'Create draft application'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
