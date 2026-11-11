import { Navigate, type RouteObject } from 'react-router-dom'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import { NotFoundPage } from '@/features/auth/pages/StatusPages'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PartnerRoute } from './components/PartnerRoute'
import { PARTNER_ROUTES as R } from './config/routes'
import { PartnerLayout } from './layouts/PartnerLayout'
import PartnerApplicationPage from './pages/PartnerApplicationPage'
import PartnerOnboardingPage from './pages/PartnerOnboardingPage'
import PartnerCompanyPage from './pages/PartnerCompanyPage'
import PartnerProfileChangesPage from './pages/PartnerProfileChangesPage'
import PartnerDocumentsPage from './pages/PartnerDocumentsPage'
import PartnerDashboardPage from './pages/PartnerDashboardPage'
import PartnerActivatePage from './pages/PartnerActivatePage'
import PartnerLoginPage from './pages/PartnerLoginPage'
import PartnerProjectsPage from './pages/PartnerProjectsPage'
import PartnerPerformancePage from './pages/PartnerPerformancePage'
import PartnerMessagesPage from './pages/PartnerMessagesPage'
import PartnerMeetingsPage from './pages/PartnerMeetingsPage'
import PartnerTeamPage from './pages/PartnerTeamPage'
import PartnerFollowUpsPage from './pages/PartnerFollowUpsPage'
import PartnerSettingsPage, { PartnerAccountSection } from './pages/PartnerSettingsPage'
import PartnerSecurityPage from './pages/PartnerSecurityPage'
import PartnerPrivacyPage from './pages/PartnerPrivacyPage'
import PartnerEnquiriesPage from './pages/PartnerEnquiriesPage'
import PartnerNotificationsPage from './pages/PartnerNotificationsPage'

/**
 * /partner/*: public auth pages (AuthLayout) and a guarded portal shell. Guards are UX only; the
 * backend enforces partner access and organization isolation.
 */
export const partnerRoutes: RouteObject = {
  path: R.root,
  children: [
    {
      element: <AuthLayout />,
      children: [
        { path: 'login', element: <PartnerLoginPage /> },
        { path: 'forgot-password', element: <ForgotPasswordPage loginRoute={R.login} /> },
        { path: 'reset-password', element: <ResetPasswordPage loginRoute={R.login} /> },
        { path: 'activate', element: <PartnerActivatePage /> },
      ],
    },
    {
      element: <PartnerRoute />,
      children: [
        {
          element: <PartnerLayout />,
          children: [
            { index: true, element: <Navigate to={R.dashboard} replace /> },
            { path: 'dashboard', element: <PartnerDashboardPage /> },
            { path: 'application', element: <PartnerApplicationPage /> },
            { path: 'onboarding', element: <PartnerOnboardingPage /> },
            { path: 'company', element: <PartnerCompanyPage /> },
            { path: 'documents', element: <PartnerDocumentsPage /> },
            { path: 'projects', element: <PartnerProjectsPage /> },
            { path: 'performance', element: <PartnerPerformancePage /> },
            { path: 'messages', element: <PartnerMessagesPage /> },
            { path: 'discussions', element: <Navigate to={R.messages} replace /> },
            { path: 'meetings', element: <PartnerMeetingsPage /> },
            { path: 'follow-ups', element: <PartnerFollowUpsPage /> },
            { path: 'notifications', element: <PartnerNotificationsPage /> },
            { path: 'enquiries', element: <PartnerEnquiriesPage /> },
            { path: 'profile-changes', element: <PartnerProfileChangesPage /> },
            { path: 'team', element: <PartnerTeamPage /> },
            {
              path: 'settings',
              element: <PartnerSettingsPage />,
              children: [
                { index: true, element: <PartnerAccountSection /> },
                { path: 'security', element: <PartnerSecurityPage /> },
                { path: 'privacy', element: <PartnerPrivacyPage /> },
              ],
            },
            { path: 'settings/profile', element: <Navigate to={R.settings} replace /> },
            { path: 'account', element: <Navigate to={R.settingsSecurity} replace /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
}
