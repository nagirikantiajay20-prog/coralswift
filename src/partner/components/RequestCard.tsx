import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { PARTNER_ROUTES as R } from '../config/routes'
import type { InfoRequest } from '../utils/applicationStatus'
import { day, human } from './Panel'

export function RequestCard({
  r,
  sending,
  onSend,
}: {
  r: InfoRequest
  sending: boolean
  onSend: (body: string) => Promise<unknown>
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const body = text.trim()
  return (
    <li className="space-y-2 rounded-md border border-line p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted">Requested {day(r.message.created_at)}</span>
        <StatusBadge
          label={r.answered ? 'Response sent' : 'Awaiting your response'}
          tone={r.answered ? 'success' : 'warning'}
        />
      </div>
      <p className="whitespace-pre-wrap">{r.message.body}</p>
      {r.categories.length > 0 && (
        <p>
          <span className="text-muted">Requested documents: </span>
          {r.categories.map((c) => human(c)).join(', ')}{' '}
          <Link to={R.documents} className="text-coral-ink hover:underline">
            Go to Documents
          </Link>
        </p>
      )}
      {!r.answered &&
        (open ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (body) void onSend(body).then(() => setOpen(false))
            }}
          >
            <label className="block font-medium">
              Your response
              <textarea
                value={text}
                maxLength={4000}
                rows={4}
                onChange={(e) => setText(e.target.value)}
                className="mt-1 w-full rounded-md border border-line p-2 font-normal"
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!body || sending}>
                {sending ? 'Sending…' : 'Send response'}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button size="sm" onClick={() => setOpen(true)}>
              Respond
            </Button>
            <Link to={R.company} className="self-center text-coral-ink hover:underline">
              Update company profile
            </Link>
          </div>
        ))}
    </li>
  )
}
