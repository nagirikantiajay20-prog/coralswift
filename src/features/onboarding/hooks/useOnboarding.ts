import { useQueries, useQuery } from '@tanstack/react-query'
import { appKeys } from '@/features/partner-applications/hooks/useApplications'
import { partnerApplicationsService } from '@/features/partner-applications/services/partnerApplicationsService'
import { onboardingService } from '../services/onboardingService'

export const useApprovedApplicants = () =>
  useQuery({ queryKey: ['applications', 'approved'], queryFn: onboardingService.listApproved })

/** Document counts need each application's detail (the list has no documents); shares the detail cache. */
export const useDetails = (ids: string[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: appKeys.detail(id),
      queryFn: () => partnerApplicationsService.detail(id),
    })),
  })
