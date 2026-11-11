import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import type { ApiEnvelope } from '../types'

/** Backend MeOut (GET /auth/me, PATCH /auth/me). Only the fields this editor shows. */
interface Me {
  id: string
  email: string
  full_name: string
  phone?: string | null
  account_status?: string
  mfa_enabled?: boolean
  mfa_required?: boolean
  last_login_at?: string | null
}

const ME = '/api/v1/auth/me'
const PHONE = /^\+[0-9]{7,15}$/ // ProfileUpdateIn.phone: E.164

/**
 * Own name and phone (PATCH /auth/me, staff and partners; audited by field name only). Email, role,
 * organization and status are not editable. Used by both the Admin Console and the Partner Portal.
 */
export function ProfileEditor() {
  const qc = useQueryClient()
  const key = ['auth', 'me']
  const q = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<ApiEnvelope<Me>>(ME)).data.data,
    retry: 1,
  })
  // Edits override the loaded values; untouched fields follow the server data.
  const [edit, setEdit] = useState<{ name?: string; phone?: string }>({})
  const name = edit.name ?? q.data?.full_name ?? ''
  const phone = edit.phone ?? q.data?.phone ?? ''
  const [invalid, setInvalid] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async (body: { full_name?: string; phone?: string | null }) =>
      (await api.patch<ApiEnvelope<Me>>(ME, body)).data.data,
    onSuccess: (me) => {
      qc.setQueryData(key, me)
      const st = useAuthStore.getState()
      // keep the header / greeting in sync with the new name
      if (st.user) st.setUser({ ...st.user, name: me.full_name })
      else if (st.partner) st.setPartner({ ...st.partner, name: me.full_name })
      setEdit({})
      toast.success('Profile updated.')
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    const p = phone.trim()
    if (!n) return setInvalid('Name is required.')
    if (n.length > 150) return setInvalid('Name must be 150 characters or fewer.')
    if (p && !PHONE.test(p))
      return setInvalid('Enter the phone number in international format, e.g. +919876543210.')
    setInvalid(null)
    const body: { full_name?: string; phone?: string | null } = {}
    if (n !== q.data?.full_name) body.full_name = n
    if (p !== (q.data?.phone ?? '')) body.phone = p || null
    if (!Object.keys(body).length) return toast.info('Nothing to change.')
    save.mutate(body)
  }

  const me = q.data
  const sessionEmail = useAuthStore((st) => st.user?.email ?? st.partner?.email ?? '')
  return (
    <form onSubmit={submit} className="max-w-md space-y-3" noValidate>
      <div>
        <Label htmlFor="pe-name">Full name</Label>
        <Input
          id="pe-name"
          value={name}
          maxLength={150}
          disabled={q.isPending}
          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="pe-phone">Phone (optional, international format)</Label>
        <Input
          id="pe-phone"
          inputMode="tel"
          placeholder="+919876543210"
          value={phone}
          disabled={q.isPending}
          onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="pe-email">Email address</Label>
        <Input id="pe-email" value={me?.email ?? sessionEmail} readOnly />
      </div>
      {me && (
        <p className="text-xs text-muted">
          {me.account_status ? `Account ${me.account_status}` : ''}
          {me.mfa_enabled !== undefined
            ? ` · Two-step verification ${me.mfa_enabled ? 'on' : 'off'}`
            : ''}
          {me.last_login_at ? ` · Last sign-in ${new Date(me.last_login_at).toLocaleString()}` : ''}
        </p>
      )}
      {(invalid || q.isError || save.isError) && (
        <p role="alert" className="text-sm text-rose-800">
          {invalid ?? toAppError(q.error ?? save.error).message}
        </p>
      )}
      <Button type="submit" disabled={q.isPending || save.isPending}>
        {save.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
