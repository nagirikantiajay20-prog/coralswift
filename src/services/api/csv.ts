import { isAxiosError } from 'axios'
import { toAppError } from './errors'
import { api } from './client'

/** Error bodies requested as blobs arrive as Blobs; turn the JSON envelope back into an AxiosError body. */
async function jsonOf(blob: unknown): Promise<unknown> {
  try {
    return blob instanceof Blob ? JSON.parse(await blob.text()) : blob
  } catch {
    return undefined
  }
}

/**
 * GET a CSV and save it. The backend answers failures (401/403/409/422/429, or a 200 with the
 * envelope) as JSON, which must never be saved as a "CSV": every non-CSV or empty body is reported
 * instead of downloaded. Auth failures still go through the shared 401 refresh interceptor.
 */
export async function downloadCsv(
  url: string,
  params: Record<string, string | undefined>,
  filename: string,
) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  let res
  try {
    res = await api.get<Blob>(url, { params: clean, responseType: 'blob' })
  } catch (e) {
    if (isAxiosError(e) && e.response) e.response.data = await jsonOf(e.response.data)
    throw new Error(toAppError(e).message, { cause: e })
  }
  const blob = res.data
  if (String(res.headers?.['content-type'] ?? blob.type).includes('json')) {
    const body = (await jsonOf(blob)) as { message?: unknown } | undefined
    throw new Error(typeof body?.message === 'string' ? body.message : 'The export failed.')
  }
  if (!blob.size) throw new Error('The export is empty.')
  const href = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href, download: filename }).click()
  URL.revokeObjectURL(href)
}
