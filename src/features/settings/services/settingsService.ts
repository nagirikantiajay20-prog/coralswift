import { settingsEndpoints } from '@/config/endpoints'
import { api } from '@/services/api/client'
import { normalizeSettings } from '../utils/settings'

export const settingsService = {
  list: async () => {
    const { data } = await api.get<{ data: unknown }>(settingsEndpoints.list)
    return normalizeSettings(data.data)
  },
  put: async (key: string, value: string) =>
    void (await api.put(settingsEndpoints.item(key), { value })),
  remove: async (key: string) => void (await api.delete(settingsEndpoints.item(key))),
}
