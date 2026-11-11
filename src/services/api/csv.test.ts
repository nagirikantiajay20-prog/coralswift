import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('./client', () => ({ api: { get: (...a: unknown[]) => get(...a) } }))

import { downloadCsv } from './csv'

const json = (o: unknown) => new Blob([JSON.stringify(o)], { type: 'application/json' })
let clicks = 0

describe('downloadCsv', () => {
  beforeEach(() => {
    get.mockReset()
    clicks = 0
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => void clicks++)
  })

  it('saves a real CSV', async () => {
    get.mockResolvedValue({
      data: new Blob(['a,b\n1,2'], { type: 'text/csv' }),
      headers: { 'content-type': 'text/csv' },
    })
    await downloadCsv('/x.csv', { q: 'a', skip: undefined }, 'f.csv')
    expect(get.mock.calls[0][1].params).toEqual({ q: 'a' })
    expect(clicks).toBe(1)
  })

  it('reports a JSON envelope returned with 200 instead of downloading it', async () => {
    get.mockResolvedValue({
      data: json({ success: false, message: 'Export blocked' }),
      headers: { 'content-type': 'application/json' },
    })
    await expect(downloadCsv('/x.csv', {}, 'f.csv')).rejects.toThrow('Export blocked')
    expect(clicks).toBe(0)
  })

  it('unwraps the JSON error envelope of a 403 blob response', async () => {
    const err = Object.assign(new Error('403'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: json({
          success: false,
          message: 'Forbidden for your role',
          error: { code: 'FORBIDDEN' },
        }),
      },
    })
    get.mockRejectedValue(err)
    await expect(downloadCsv('/x.csv', {}, 'f.csv')).rejects.toThrow('Forbidden for your role')
    expect(clicks).toBe(0)
  })

  it('rejects an empty body', async () => {
    get.mockResolvedValue({ data: new Blob([]), headers: {} })
    await expect(downloadCsv('/x.csv', {}, 'f.csv')).rejects.toThrow('empty')
  })
})
