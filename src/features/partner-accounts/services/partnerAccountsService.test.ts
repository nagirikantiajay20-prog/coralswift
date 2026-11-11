import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { partnerAccountsService } from './partnerAccountsService'

const acct = (id: string, org: string | null) => ({
  id,
  email: `${id}@x.test`,
  organization: org ? { id: org, legal_name: org } : null,
})
afterEach(() => vi.restoreAllMocks())

describe('partnerAccountsService', () => {
  it('finds the accounts of one organization across pages', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation(async (_u, cfg) => {
      const page = (cfg as { params: { page: number } }).params.page
      const rows =
        page === 1
          ? Array.from({ length: 100 }, (_, i) => acct(`u${i}`, i === 7 ? 'orgA' : 'orgB'))
          : [acct('u100', 'orgA'), acct('u101', null)]
      return { data: { data: rows, meta: { total: 102 } } }
    })
    const r = await partnerAccountsService.ofOrganization('orgA')
    expect(r.rows.map((a) => a.id)).toEqual(['u7', 'u100'])
    expect(r.partial).toBe(false)
    expect(get.mock.calls[0][1]?.params).toMatchObject({ user_type: 'partner', page_size: 100 })
  })

  it('reports no accounts for an organization without one', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [acct('u1', 'orgB')], meta: { total: 1 } } })
    expect(await partnerAccountsService.ofOrganization('orgA')).toEqual({ rows: [], partial: false })
  })

  it('reads one account with its recent activity', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: { data: { ...acct('u9', 'orgA'), recent_activity: [{ action: 'login', actor_name: null, created_at: 't' }] } },
    })
    const d = await partnerAccountsService.detail('u9')
    expect(get).toHaveBeenCalledWith('/api/v1/admin/accounts/u9')
    expect(d.recent_activity).toHaveLength(1)
  })
})
