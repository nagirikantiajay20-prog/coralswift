import { useQuery } from '@tanstack/react-query'
import { followUpsMetrics } from '../services/followUpsService'

/** Key starts with 'enquiries' so every Phase 8-10 mutation (and ours) refreshes the counts. */
export const useDiscussionMetrics = (canStrategic: boolean, canApplications: boolean) =>
  useQuery({
    queryKey: ['enquiries', 'p11-metrics', canStrategic, canApplications],
    queryFn: () => followUpsMetrics.load(canStrategic, canApplications),
    retry: false,
    staleTime: 30_000,
  })
