import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { contentManagementService as svc } from '../services/contentManagementService'
import type { AdminContent } from '../types'
import {
  actionsFor,
  CAPABILITIES,
  contentFormSchema,
  EMPTY_FORM,
  isDirty,
  slugify,
  slugSchema,
  STATUS_LABEL,
  toForm,
  toPatch,
  validateAttachment,
  validateNote,
} from '../utils/content'
import ContentEditorPage from './ContentEditorPage'
import UnavailablePage from './UnavailablePages'
import WebsiteDashboardPage from './WebsiteDashboardPage'
import WebsitePagesPage from './WebsitePagesPage'

const item: AdminContent = {
  id: 'id-1',
  slug: 'about-us',
  content_type: 'page',
  title: 'About us',
  summary: null,
  body: 'Hello',
  category: null,
  tags: ['a', 'b'],
  status: 'draft',
  published_at: null,
  last_reviewed_at: null,
  attachment: null,
  owner_id: 'owner-123456',
  reviewer_id: null,
  review_note: null,
  current_version: 3,
  claim_ids: [],
}

const wrap = (routes: { path: string; element: React.ReactNode }[], at: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [at] })} />
    </QueryClientProvider>,
  )
const setRole = (role: 'super_administrator' | 'content_administrator') =>
  useAuthStore.setState({ user: { id: 'me', name: 'T', email: 't@x.test', role } })
afterEach(() => vi.restoreAllMocks())

describe('slug validation', () => {
  it('accepts the backend pattern and rejects the rest', () => {
    expect(slugSchema.safeParse('about-us').success).toBe(true)
    for (const bad of ['a', 'About', 'a--b', '-a', 'a-', 'a b', 'a_b', 'x'.repeat(121)]) {
      expect(slugSchema.safeParse(bad).success, bad).toBe(false)
    }
  })
  it('slugify output always satisfies the pattern', () => {
    expect(slugify('  Our Services & More! ')).toBe('our-services-more')
    expect(slugSchema.safeParse(slugify('Our Services & More!')).success).toBe(true)
  })
})

describe('content form validation and transformation', () => {
  const ok = { ...EMPTY_FORM, slug: 'abc', title: 'T', body: 'B' }
  it('requires title and body, enforces length limits', () => {
    expect(contentFormSchema.safeParse(ok).success).toBe(true)
    expect(contentFormSchema.safeParse({ ...ok, title: ' ' }).success).toBe(false)
    expect(contentFormSchema.safeParse({ ...ok, body: '' }).success).toBe(false)
    expect(contentFormSchema.safeParse({ ...ok, summary: 'x'.repeat(501) }).success).toBe(false)
    expect(contentFormSchema.safeParse({ ...ok, category: 'x'.repeat(81) }).success).toBe(false)
  })
  it('validates tags (pattern, max 15)', () => {
    expect(contentFormSchema.safeParse({ ...ok, tags: 'a, b-1' }).success).toBe(true)
    expect(contentFormSchema.safeParse({ ...ok, tags: 'Bad Tag' }).success).toBe(false)
    const many = Array.from({ length: 16 }, (_, i) => `t${i}`).join(',')
    expect(contentFormSchema.safeParse({ ...ok, tags: many }).success).toBe(false)
  })
  it('round-trips an item and preserves content; patch omits slug/type', () => {
    const f = toForm(item)
    expect(f).toMatchObject({ slug: 'about-us', body: 'Hello', tags: 'a, b', summary: '' })
    const patch = toPatch(f)
    expect(patch).toEqual({
      title: 'About us',
      summary: null,
      body: 'Hello',
      category: null,
      tags: ['a', 'b'],
      claim_ids: [],
    })
    expect(patch).not.toHaveProperty('slug')
  })
  it('detects unsaved changes only when content differs', () => {
    const f = toForm(item)
    expect(isDirty(f, toForm(item))).toBe(false)
    expect(isDirty({ ...f, summary: '   ' }, f)).toBe(false) // blank == null
    expect(isDirty({ ...f, body: 'Hello!' }, f)).toBe(true)
  })
})

describe('status mapping and publishing actions', () => {
  it('uses only backend statuses', () => {
    expect(Object.keys(STATUS_LABEL)).toEqual([
      'draft',
      'in_review',
      'approved',
      'published',
      'archived',
    ])
  })
  it('offers documented transitions only, and approve/reject to super administrators only', () => {
    const names = (s: Parameters<typeof actionsFor>[0], r: Parameters<typeof actionsFor>[1]) =>
      actionsFor(s, r).map((a) => a.action)
    expect(names('draft', 'content_administrator')).toEqual(['submit', 'archive'])
    expect(names('in_review', 'content_administrator')).toEqual([])
    expect(names('in_review', 'super_administrator')).toEqual(['approve', 'reject'])
    expect(names('approved', 'super_administrator')).toEqual(['publish', 'reopen'])
    expect(names('published', 'super_administrator')).toContain('unpublish')
    expect(names('archived', 'super_administrator')).toEqual([])
    expect(names('draft', undefined)).not.toContain('publish') // cannot skip review
  })
  it('requires a note to reject, caps note length', () => {
    const reject = actionsFor('in_review', 'super_administrator')[1]
    expect(validateNote(reject, ' ')).toBeTruthy()
    expect(validateNote(reject, 'fix typos')).toBeNull()
    expect(validateNote(reject, 'x'.repeat(4001))).toBeTruthy()
    expect(validateNote(actionsFor('in_review', 'super_administrator')[0], '')).toBeNull()
  })
  it('every publish-affecting action asks for confirmation text', () => {
    for (const s of ['draft', 'in_review', 'approved', 'published'] as const) {
      for (const a of actionsFor(s, 'super_administrator'))
        expect(a.confirm.length).toBeGreaterThan(10)
    }
  })
})

describe('attachment validation', () => {
  it('rejects missing/empty files and long labels; leaves type/size to the backend', () => {
    expect(validateAttachment(null, '')).toBeTruthy()
    expect(validateAttachment(new File([], 'a.pdf'), '')).toBeTruthy()
    expect(validateAttachment(new File(['x'], 'a.pdf'), 'x'.repeat(41))).toBeTruthy()
    expect(validateAttachment(new File(['x'], 'a.pdf'), 'v1')).toBeNull()
  })
})

describe('capabilities', () => {
  it('flags unsupported features instead of simulating them', () => {
    const off = CAPABILITIES.filter((c) => !c.supported).map((c) => c.name)
    expect(off.join(' ')).toMatch(/Scheduled/)
    expect(off.join(' ')).toMatch(/Media library/)
    expect(off.join(' ')).toMatch(/SEO/)
  })
})

describe('pages', () => {
  it('list: shows rows, status badge, and links to the editor', async () => {
    vi.spyOn(svc, 'list').mockResolvedValue({ rows: [item], meta: { total: 1 } })
    wrap([{ path: '/', element: <WebsitePagesPage /> }], '/')
    expect(await screen.findByRole('link', { name: 'About us' })).toHaveAttribute(
      'href',
      '/admin/website/pages/id-1',
    )
    expect(screen.getByText('Draft', { selector: 'span' })).toBeInTheDocument()
  })
  it('list: shows the backend error message (403)', async () => {
    vi.spyOn(svc, 'list').mockRejectedValue(new Error('Forbidden here'))
    wrap([{ path: '/', element: <WebsitePagesPage /> }], '/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden here')
  })
  it('list: empty state', async () => {
    vi.spyOn(svc, 'list').mockResolvedValue({ rows: [], meta: null })
    wrap([{ path: '/', element: <WebsitePagesPage queue /> }], '/')
    expect(await screen.findByText('Nothing is waiting for review')).toBeInTheDocument()
  })
  it('dashboard: totals come from meta.total; missing total is not shown as zero', async () => {
    vi.spyOn(svc, 'list').mockImplementation(async (p) => ({
      rows: [],
      meta: p.status === 'published' ? { total: 7 } : null,
    }))
    wrap([{ path: '/', element: <WebsiteDashboardPage /> }], '/')
    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(
      (await screen.findAllByText('Total not provided by the backend')).length,
    ).toBeGreaterThan(0)
  })
  it('unavailable screens say so and offer no controls', () => {
    wrap([{ path: '/', element: <UnavailablePage kind="media" /> }], '/')
    expect(screen.getByText(/does not support this yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('editor', () => {
  vi.spyOn(svc, 'claims').mockResolvedValue({ rows: [], meta: null })
  const routes = [
    { path: '/admin/website/pages/:id', element: <ContentEditorPage /> },
    { path: '/admin/website/pages', element: <p>list</p> },
  ]

  it('draft: editable; unsaved edits show a warning and enable save', async () => {
    setRole('content_administrator')
    vi.spyOn(svc, 'claims').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(svc, 'get').mockResolvedValue(item)
    vi.spyOn(svc, 'versions').mockResolvedValue([])
    wrap(routes, '/admin/website/pages/id-1')
    const title = await screen.findByLabelText('Title')
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled()
    fireEvent.change(title, { target: { value: 'About us!' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled()
    // status changes are blocked until saved
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled()
  })

  it('non-draft is read-only; reviewer actions only for super administrators', async () => {
    setRole('content_administrator')
    vi.spyOn(svc, 'claims').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(svc, 'get').mockResolvedValue({ ...item, status: 'in_review' })
    vi.spyOn(svc, 'versions').mockResolvedValue([])
    wrap(routes, '/admin/website/pages/id-1')
    expect(await screen.findByLabelText('Title')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('super administrator can approve; confirmation precedes the API call', async () => {
    setRole('super_administrator')
    vi.spyOn(svc, 'claims').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(svc, 'get').mockResolvedValue({ ...item, status: 'in_review' })
    vi.spyOn(svc, 'versions').mockResolvedValue([])
    const act = vi.spyOn(svc, 'act').mockResolvedValue({ ...item, status: 'approved' })
    wrap(routes, '/admin/website/pages/id-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    expect(act).not.toHaveBeenCalled()
    fireEvent.click(within_dialog('Approve'))
    await waitFor(() => expect(act).toHaveBeenCalledWith('id-1', 'approve', undefined))
  })

  it('shows 404 from the backend', async () => {
    vi.spyOn(svc, 'get').mockRejectedValue(new Error('Content not found'))
    wrap(routes, '/admin/website/pages/id-1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Content not found')
  })
})

function within_dialog(name: string) {
  const dlg = screen.getByRole('dialog')
  const btn = Array.from(dlg.querySelectorAll('button')).find((b) => b.textContent === name)
  if (!btn) throw new Error(`no ${name} button in dialog`)
  return btn
}
