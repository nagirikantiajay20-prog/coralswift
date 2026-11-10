import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toAppError } from '@/services/api/errors'
import { userManagementService as svc } from '../services/userManagementService'

export const useStaffList = () =>
  useQuery({ queryKey: ['staff', 'list'], queryFn: () => svc.list(), retry: false })

export const useStaffActivity = (id: string) =>
  useQuery({ queryKey: ['staff', 'activity', id], queryFn: () => svc.activity(id), retry: false })

/** Runs a staff mutation, toasts the outcome (backend message on failure, e.g. 409/422) and refreshes staff data. */
export function useStaffMutation<V>(
  fn: (v: V) => Promise<unknown>,
  success: string,
  onDone?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      toast.success(success)
      await qc.invalidateQueries({ queryKey: ['staff'] })
      onDone?.()
    },
    onError: (e) => toast.error(toAppError(e).message),
  })
}
