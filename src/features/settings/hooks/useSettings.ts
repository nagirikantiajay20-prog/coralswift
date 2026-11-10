import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toAppError } from '@/services/api/errors'
import { settingsService as svc } from '../services/settingsService'

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => svc.list(), retry: false })

/** Success toast only after the backend accepted the change; then refetch so the UI shows stored truth. */
export function useSettingMutation<V>(
  fn: (v: V) => Promise<unknown>,
  success: string,
  onDone?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      toast.success(success)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['settings'] }),
        qc.invalidateQueries({ queryKey: ['audit'] }),
      ])
      onDone?.()
    },
    onError: (e) => toast.error(toAppError(e).message),
  })
}
