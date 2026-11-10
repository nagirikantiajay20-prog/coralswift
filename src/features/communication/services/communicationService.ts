import { communicationEndpoints as e } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type { ApiList, OutboxParams, OutboxRow, Template, TemplateBody } from '../types'

interface One<T> {
  data: T | null
}

export const communicationService = {
  outbox: async (params: OutboxParams) => {
    const { data } = await api.get<ApiList<OutboxRow>>(e.outbox, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  /** 202: retries eligible emails after the response. Counts are returned, not delivery results. */
  dispatch: async () => (await api.post<One<Record<string, number>>>(e.dispatch)).data.data ?? {},
  retry: (id: string) => api.post(e.retry(id)),
  templates: async () => (await api.get<ApiList<Template>>(e.templates)).data.data ?? [],
  saveTemplate: async (key: string, body: TemplateBody) =>
    (await api.put<One<Template>>(e.template(key), body)).data.data,
  revertTemplate: (key: string) => api.delete(e.template(key)),
  preview: async (key: string, body: TemplateBody) =>
    (await api.post<One<Record<string, string>>>(e.preview(key), body)).data.data ?? {},
}
