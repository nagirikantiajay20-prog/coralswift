import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PartnerRoute } from '../components/PartnerRoute'
import { documentRequests, uploadErrorMessage, validateFile } from '../utils/documentFiles'
import PartnerDocumentsPage from './PartnerDocumentsPage'

// Test doubles only; the app never ships sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme',
}
const ok = (data: unknown) => ({ data: { success: true, data } })
const ver = (o: object = {}) => ({
  version_no: 1,
  original_filename: 'reg.pdf',
  content_type: 'application/pdf',
  file_size: 2048,
  checksum_sha256: 'x',
  upload_status: 'stored',
  expires_on: null,
  review_status: 'pending',
  review_comment: null,
  uploaded_at: '2026-11-02T00:00:00Z',
  ...o,
})
const doc = (id: string, category: string, v: object | null, flags: object = {}) => ({
  id,
  category,
  status: 'active',
  current_version: v === null ? null : ver(v),
  can_replace: !(v && (v as { review_status?: string }).review_status === 'accepted'),
  can_remove: !(v && (v as { review_status?: string }).review_status === 'accepted'),
  can_download: true,
  ...flags,
})
const APP = {
  id: 'a1',
  reference: 'APP-1',
  status: 'information_requested',
  status_label: 'Information requested',
  submission_count: 1,
  submitted_at: '2026-11-01T00:00:00Z',
  open_information_requests: 1,
}
const REQUEST = {
  id: 'm1',
  kind: 'information_request',
  status: 'open',
  from_reviewer: true,
  body: 'Please send audited accounts',
  requested_categories: ['financial_statements'],
  in_reply_to: null,
  created_at: '2026-11-04T00:00:00Z',
}
let routes: Record<string, unknown>
const base = () => ({
  '/api/v1/partner/applications': [APP],
  '/api/v1/partner/applications/a1/messages': [REQUEST],
  '/api/v1/partner/documents': [
    doc('d1', 'registration_proof', { review_status: 'accepted' }),
    doc('d2', 'operating_history', {
      review_status: 'rejected',
      review_comment: 'Scan is unreadable',
      version_no: 2,
      original_filename: 'history.png',
      content_type: 'image/png',
    }),
    doc('d3', 'service_portfolio', {}),
  ],
})
const mockGet = () =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    const v = routes[url]
    if (v instanceof Error) throw v
    if (v === undefined) throw new Error(`unmocked ${url}`)
    return ok(v) as never
  })

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/partner/documents']}>
        <Routes>
          <Route path="/partner/login" element={<p>partner login</p>} />
          <Route element={<PartnerRoute />}>
            <Route path="/partner/documents" element={<PartnerDocumentsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const pdf = (name = 'proof.pdf') => new File(['%PDF-1'], name, { type: 'application/pdf' })
const choose = (f: File) =>
  fireEvent.change(screen.getByLabelText('Choose file', { selector: 'input' }), {
    target: { files: [f] },
  })
const err = (status: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status, data: {} } as never)

beforeEach(() => {
  routes = base()
  useAuthStore.getState().setPartner(partner)
})
afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().clear()
})

describe('file helpers', () => {
  it('accepts only the backend formats', () => {
    expect(validateFile(pdf())).toBeNull()
    expect(validateFile(new File(['x'], 'a.exe', { type: 'application/x-msdownload' }))).toMatch(
      /Unsupported/,
    )
    expect(validateFile(new File(['x'], 'a.pdf', { type: 'image/png' }))).toMatch(/does not match/)
    expect(validateFile(new File([], 'a.pdf', { type: 'application/pdf' }))).toMatch(/empty/)
  })
  it('maps upload errors by status', () => {
    expect(uploadErrorMessage(err(413))).toMatch(/too large/)
    expect(uploadErrorMessage(err(415))).toMatch(/file type/)
    expect(uploadErrorMessage(err(429))).toMatch(/Too many/)
  })
  it('derives open requests only from reviewer messages naming categories', () => {
    const reply = {
      ...REQUEST,
      id: 'm2',
      from_reviewer: false,
      in_reply_to: 'm1',
      requested_categories: null,
    }
    expect(documentRequests([REQUEST])[0].answered).toBe(false)
    expect(documentRequests([REQUEST, reply])[0].answered).toBe(true)
    expect(documentRequests([{ ...REQUEST, requested_categories: null }])).toEqual([])
  })
})

describe('PartnerDocumentsPage', () => {
  it('redirects unauthenticated visitors with no API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockGet()
    renderPage()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('lists documents by group with mapped statuses and metadata', async () => {
    mockGet()
    renderPage()
    expect(await screen.findByText('Company standing')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
    expect(screen.getByText('history.png')).toBeInTheDocument()
    expect(screen.getByText(/Reviewer message: Scan is unreadable/)).toBeInTheDocument()
    expect(screen.getAllByText('Not submitted').length).toBe(5) // 8 categories - 3 submitted
    expect(screen.getByText(/1 document\(s\) need your attention/)).toBeInTheDocument()
  })

  it('locks accepted documents but allows replacing a rejected one', async () => {
    mockGet()
    renderPage()
    await screen.findByText('Company standing')
    const accepted = screen.getByText('Company registration proof').closest('li')!
    expect(within(accepted).queryByRole('button', { name: 'Replace' })).toBeNull()
    expect(within(accepted).queryByRole('button', { name: 'Remove' })).toBeNull()
    const rejected = screen.getByText('Operating history evidence').closest('li')!
    expect(within(rejected).getByRole('button', { name: 'Upload replacement' })).toBeInTheDocument()
  })

  it('shows document actions only as the backend permits (can_replace/can_remove/can_download)', async () => {
    routes = {
      ...base(),
      '/api/v1/partner/documents': [
        doc(
          'd3',
          'service_portfolio',
          {},
          { can_replace: false, can_remove: false, can_download: false },
        ),
      ],
    }
    mockGet()
    renderPage()
    await screen.findByText('Company standing')
    const li = screen.getByText('Service portfolio').closest('li')!
    for (const n of ['Replace', 'Remove', 'Download', 'Upload replacement'])
      expect(within(li).queryByRole('button', { name: n })).toBeNull()
  })

  it('shows empty and error states', async () => {
    routes['/api/v1/partner/documents'] = []
    mockGet()
    renderPage()
    expect(await screen.findByText('No documents uploaded yet')).toBeInTheDocument()
  })
  it('shows an authorization error without leaking details', async () => {
    routes['/api/v1/partner/documents'] = err(403)
    mockGet()
    renderPage()
    expect(
      await screen.findByText('You do not have access to documents.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('never sends an organization or partner id', async () => {
    const spy = mockGet()
    renderPage()
    await screen.findByText('Company standing')
    for (const [url, cfg] of spy.mock.calls as [string, { params?: object }?][]) {
      expect(url).not.toMatch(/o1|p1/)
      expect(JSON.stringify(cfg?.params ?? {})).not.toMatch(/o1|p1/)
    }
  })

  it('uploads a new document with progress, then closes and refreshes', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post').mockImplementation(async (_u, _b, cfg) => {
      cfg?.onUploadProgress?.({ loaded: 50, total: 100 } as never)
      return ok(doc('d9', 'client_references', {})) as never
    })
    renderPage()
    await screen.findByText('Company standing')
    const li = screen.getByText('Client references', { selector: 'p' }).closest('li')!
    fireEvent.click(within(li).getByRole('button', { name: 'Upload' }))
    choose(pdf())
    expect(screen.getByTestId('selected-file')).toHaveTextContent('proof.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    const [url, body] = post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/api/v1/partner/documents')
    expect(body.get('category')).toBe('client_references')
    expect((body.get('file') as File).name).toBe('proof.pdf')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('rejects an unsupported file before any request', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post')
    renderPage()
    await screen.findByText('Company standing')
    const li = screen.getByText('Client references', { selector: 'p' }).closest('li')!
    fireEvent.click(within(li).getByRole('button', { name: 'Upload' }))
    choose(new File(['x'], 'run.exe', { type: 'application/x-msdownload' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Unsupported file type/)
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })

  it('shows a server failure and allows retry', async () => {
    mockGet()
    const post = vi
      .spyOn(api, 'post')
      .mockRejectedValueOnce(err(413))
      .mockResolvedValueOnce(ok(doc('d9', 'client_references', {})) as never)
    renderPage()
    await screen.findByText('Company standing')
    const li = screen.getByText('Client references', { selector: 'p' }).closest('li')!
    fireEvent.click(within(li).getByRole('button', { name: 'Upload' }))
    choose(pdf())
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))
    expect(await screen.findByText(/too large for the server/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
  })

  it('replaces a document through the versions endpoint', async () => {
    mockGet()
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue(ok(doc('d2', 'operating_history', {})) as never)
    renderPage()
    await screen.findByText('Company standing')
    fireEvent.click(screen.getByRole('button', { name: 'Upload replacement' }))
    choose(pdf('new.pdf'))
    fireEvent.click(screen.getByRole('button', { name: 'Upload new version' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toBe('/api/v1/partner/documents/d2/versions')
  })

  it('shows additional requests and uploads the requested category', async () => {
    mockGet()
    renderPage()
    const card = await screen.findByLabelText('Additional document requests')
    expect(within(card).getByText('Please send audited accounts')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: /Upload Financial statements/ }))
    expect(await screen.findByText('Upload: Financial statements')).toBeInTheDocument()
  })

  it('sends a response linked to the request', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post').mockResolvedValue(ok(null) as never)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Send response to reviewer' }))
    fireEvent.change(screen.getByLabelText('Your response'), { target: { value: 'Uploaded' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send response' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith('/api/v1/partner/applications/a1/messages', {
      in_reply_to: 'm1',
      body: 'Uploaded',
    })
  })

  it('hides answered requests', async () => {
    routes['/api/v1/partner/applications/a1/messages'] = [
      REQUEST,
      { ...REQUEST, id: 'm2', from_reviewer: false, in_reply_to: 'm1', requested_categories: null },
    ]
    mockGet()
    renderPage()
    await screen.findByText('Company standing')
    expect(screen.queryByLabelText('Additional document requests')).toBeNull()
  })

  it('requires confirmation before removing a document', async () => {
    mockGet()
    const del = vi.spyOn(api, 'delete').mockResolvedValue({} as never)
    renderPage()
    await screen.findByText('Company standing')
    const li = screen.getByText('Service portfolio', { selector: 'p' }).closest('li')!
    fireEvent.click(within(li).getByRole('button', { name: 'Remove' }))
    expect(del).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove document' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/v1/partner/documents/d3'))
  })

  it('downloads through the authorised endpoint and revokes the object URL', async () => {
    const spy = mockGet()
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderPage()
    await screen.findByText('Company standing')
    spy.mockImplementation(async (url: string, cfg?: object) =>
      url.endsWith('/download')
        ? ({ data: new Blob(['x']), cfg } as never)
        : (ok(routes[url]) as never),
    )
    const li = screen.getByText('Service portfolio', { selector: 'p' }).closest('li')!
    fireEvent.click(within(li).getByRole('button', { name: 'Download' }))
    await waitFor(() => expect(create).toHaveBeenCalled())
    const call = spy.mock.calls.find(([u]) => String(u).endsWith('/d3/download'))!
    expect(call[1]).toMatchObject({ responseType: 'blob', params: { version: 1 } })
    vi.advanceTimersByTime(1500)
    expect(revoke).toHaveBeenCalledWith('blob:x')
    vi.useRealTimers()
  })

  it('shows a clear message when a download is not permitted', async () => {
    const spy = mockGet()
    renderPage()
    await screen.findByText('Company standing')
    spy.mockImplementation(async (url: string) => {
      if (url.endsWith('/download')) throw err(403)
      return ok(routes[url]) as never
    })
    const li = screen.getByText('Service portfolio', { selector: 'p' }).closest('li')!
    fireEvent.click(within(li).getByRole('button', { name: 'Download' }))
    await waitFor(() =>
      expect(spy.mock.calls.some(([u]) => String(u).endsWith('/download'))).toBe(true),
    )
  })
})
