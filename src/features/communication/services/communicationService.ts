import { communicationEndpoints as e } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type { ApiList, FeedItem, OutboxParams, OutboxRow, Template, TemplateBody } from '../types'

interface One<T> {
  data: T | null
}

export const communicationService = {
  feed: async (params: {
    unread?: boolean
    archived?: boolean
    page: number
    page_size: number
  }) => {
    const { data } = await api.get<ApiList<FeedItem>>(e.feed, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  feedRead: (id: string) => api.post(`${e.feed}/${id}/read`),
  feedArchive: (id: string) => api.post(`${e.feed}/${id}/archive`),
  feedReadAll: () => api.post(`${e.feed}/read-all`),
  outbox: async (params: OutboxParams) => {
    const { data } = await api.get<ApiList<OutboxRow>>(e.outbox, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  /** 202: retries eligible emails after the response. Counts are returned, not delivery results. */
  dispatch: async () => (await api.post<One<Record<string, number>>>(e.dispatch)).data.data ?? {},
  retry: (id: string) => api.post(e.retry(id)),
  templates: async () => (await api.get<ApiList<Template>>(e.templates)).data.data ?? [],
  placeholders: async () =>
    (await api.get<ApiList<{ name: string }>>(e.placeholders)).data.data ?? [],
  saveTemplate: async (key: string, body: TemplateBody) =>
    (await api.put<One<Template>>(e.template(key), body)).data.data,
  revertTemplate: (key: string) => api.delete(e.template(key)),
  preview: async (key: string, body: TemplateBody) =>
    (await api.post<One<Record<string, string>>>(e.preview(key), body)).data.data ?? {},
}
