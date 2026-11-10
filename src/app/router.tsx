import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom'
import { LoadingState } from '@/components/common/states'
import type { ModuleKey } from '@/config/permissions'
import { ROUTES } from '@/config/routes'
import { ModuleRoute, ProtectedRoute } from '@/features/auth/components/guards'
import ChangePasswordPage from '@/features/auth/pages/ChangePasswordPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import LoginPage from '@/features/auth/pages/LoginPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import {
  NotFoundPage,
  SessionExpiredPage,
  UnauthorizedPage,
} from '@/features/auth/pages/StatusPages'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { partnerRoutes } from '@/partner/routes'

const Dashboard = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const Profile = lazy(() => import('@/features/settings/pages/ProfilePage'))
const Applications = lazy(() => import('@/features/partner-applications/pages/ApplicationsPage'))
const ApplicationDetail = lazy(
  () => import('@/features/partner-applications/pages/ApplicationDetailPage'),
)
const ReviewWorkspace = lazy(
  () => import('@/features/application-review/pages/ApplicationReviewWorkspacePage'),
)
const ApplicationReviews = lazy(
  () => import('@/features/application-review/pages/ApplicationReviewsPage'),
)
const Enquiries = lazy(() => import('@/features/business-enquiries/pages/EnquiriesPage'))
const EnquiryOverview = lazy(
  () => import('@/features/business-enquiries/pages/EnquiryOverviewPage'),
)
const EnquiryDetail = lazy(() => import('@/features/business-enquiries/pages/EnquiryDetailPage'))
const Strategic = lazy(() => import('@/features/strategic-enquiries/pages/StrategicEnquiriesPage'))
const StrategicOverview = lazy(
  () => import('@/features/strategic-enquiries/pages/StrategicOverviewPage'),
)
const StrategicDetail = lazy(
  () => import('@/features/strategic-enquiries/pages/StrategicEnquiryDetailPage'),
)
const LeadAssignment = lazy(() => import('@/features/lead-assignment/pages/LeadAssignmentPage'))
const Discussions = lazy(() => import('@/features/discussions/pages/DiscussionsPage'))
const FollowUps = lazy(() => import('@/features/follow-ups/pages/FollowUpsPage'))
const ApprovedApplicants = lazy(() => import('@/features/onboarding/pages/ApprovedApplicantsPage'))
const OnboardingWorkspace = lazy(
  () => import('@/features/onboarding/pages/OnboardingWorkspacePage'),
)
const Onboarding = lazy(() => import('@/features/onboarding/pages/OnboardingPage'))
const Partners = lazy(() => import('@/features/partner-management/pages/PartnersPage'))
const PartnerDetail = lazy(() => import('@/features/partner-management/pages/PartnerDetailPage'))
const PartnerAccounts = lazy(() => import('@/features/partner-accounts/pages/PartnerAccountsPage'))
const PartnerAccountDetail = lazy(
  () => import('@/features/partner-accounts/pages/PartnerAccountDetailPage'),
)
const Documents = lazy(() => import('@/features/document-management/pages/DocumentsPage'))
const AppDocuments = lazy(
  () => import('@/features/document-management/pages/ApplicationDocumentsPage'),
)
const DocumentWorkspace = lazy(
  () => import('@/features/document-management/pages/DocumentWorkspacePage'),
)
const Communications = lazy(() => import('@/features/communication/pages/CommunicationsPage'))
const CommDelivery = lazy(() => import('@/features/communication/pages/DeliveryPage'))
const CommTemplates = lazy(() => import('@/features/communication/pages/TemplatesPage'))
const CommEmails = lazy(() =>
  import('@/features/communication/pages/UnavailablePages').then((m) => ({
    default: m.EmailsPage,
  })),
)
const CommPreferences = lazy(() =>
  import('@/features/communication/pages/UnavailablePages').then((m) => ({
    default: m.PreferencesPage,
  })),
)
const Notifications = lazy(() =>
  import('@/features/communication/pages/UnavailablePages').then((m) => ({
    default: m.NotificationsPage,
  })),
)
const Website = lazy(() => import('@/features/content-management/pages/WebsiteDashboardPage'))
const WebsitePages = lazy(() => import('@/features/content-management/pages/WebsitePagesPage'))
const ContentEditor = lazy(() => import('@/features/content-management/pages/ContentEditorPage'))
const Claims = lazy(() => import('@/features/content-management/pages/ClaimsPage'))
const CmsUnavailable = lazy(() => import('@/features/content-management/pages/UnavailablePages'))
const Users = lazy(() => import('@/features/user-management/pages/UsersPage'))
const UserDetail = lazy(() => import('@/features/user-management/pages/UserDetailPage'))
const Roles = lazy(() => import('@/features/roles-permissions/pages/RolesPage'))
const Reports = lazy(() => import('@/features/reports/pages/ReportsPage'))
const AuditLogs = lazy(() => import('@/features/audit-logs/pages/AuditLogsPage'))
const AuditDetail = lazy(() => import('@/features/audit-logs/pages/AuditLogDetailPage'))
const Settings = lazy(() => import('@/features/settings/pages/SettingsPage'))
const SecuritySettings = lazy(() => import('@/features/settings/pages/SecuritySettingsPage'))

const Governance = lazy(() => import('@/features/governance/pages/GovernancePage'))

const Lazy = () => (
  <Suspense fallback={<LoadingState />}>
    <Outlet />
  </Suspense>
)

/** Routes grouped by the permission module that guards them. */
const guarded = (module: ModuleKey, children: RouteObject[]): RouteObject => ({
  element: <ModuleRoute module={module} />,
  children,
})

const reportRoutes: RouteObject[] = [
  { path: 'reports', element: <Reports /> },
  { path: 'reports/:section', element: <Reports /> },
]
const W = '/admin/website'
const contentRoutes: RouteObject[] = [
  { path: 'website', element: <Website /> },
  { path: 'website/pages', element: <WebsitePages /> },
  { path: 'website/pages/new', element: <ContentEditor /> },
  { path: 'website/pages/:id', element: <ContentEditor /> },
  { path: 'website/approval', element: <WebsitePages queue /> },
  { path: 'website/claims', element: <Claims /> },
  { path: 'website/homepage', element: <CmsUnavailable kind="homepage" /> },
  { path: 'website/services', element: <CmsUnavailable kind="services" /> },
  { path: 'website/industries', element: <CmsUnavailable kind="industries" /> },
  { path: 'website/media', element: <CmsUnavailable kind="media" /> },
  // Phase 1 paths kept as redirects
  ...(['pages', 'articles', 'categories', 'media', 'approval'] as const).map((s) => ({
    path: `content/${s}`,
    element: (
      <Navigate to={s === 'approval' || s === 'media' ? `${W}/${s}` : `${W}/pages`} replace />
    ),
  })),
]

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={ROUTES.dashboard} replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
      { path: ROUTES.resetPassword, element: <ResetPasswordPage /> },
      { path: ROUTES.unauthorized, element: <UnauthorizedPage /> },
      { path: ROUTES.sessionExpired, element: <SessionExpiredPage /> },
    ],
  },
  partnerRoutes,
  {
    path: ROUTES.admin,
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
          {
            element: <Lazy />,
            children: [
              guarded('dashboard', [{ path: 'dashboard', element: <Dashboard /> }]),
              guarded('account', [
                { path: 'profile', element: <Profile /> },
                { path: 'change-password', element: <ChangePasswordPage /> },
              ]),
              guarded('enquiries', [
                { path: 'enquiries', element: <Enquiries /> },
                { path: 'enquiries/project', element: <Enquiries scope="project" /> },
                { path: 'enquiries/general', element: <Enquiries scope="general" /> },
                { path: 'enquiries/overview', element: <EnquiryOverview /> },
                { path: 'enquiries/:id', element: <EnquiryDetail /> },
              ]),
              guarded('strategicEnquiries', [
                { path: 'strategic-enquiries', element: <Strategic /> },
                { path: 'strategic-enquiries/overview', element: <StrategicOverview /> },
                { path: 'strategic-enquiries/:id', element: <StrategicDetail /> },
              ]),
              guarded('leadAssignment', [{ path: 'lead-assignment', element: <LeadAssignment /> }]),
              guarded('discussions', [{ path: 'discussions', element: <Discussions /> }]),
              guarded('followUps', [{ path: 'follow-ups', element: <FollowUps /> }]),
              guarded('applications', [
                { path: 'applications', element: <Applications /> },
                { path: 'applications/:id', element: <ApplicationDetail /> },
              ]),
              guarded('applicationReviews', [
                { path: 'application-reviews', element: <ApplicationReviews /> },
                { path: 'application-reviews/:id', element: <ReviewWorkspace /> },
              ]),
              guarded('documents', [
                { path: 'documents', element: <Documents /> },
                { path: 'documents/:appId', element: <AppDocuments /> },
                { path: 'documents/:appId/:docId', element: <DocumentWorkspace /> },
              ]),
              guarded('onboarding', [
                { path: 'approved-applicants', element: <ApprovedApplicants /> },
                { path: 'approved-applicants/:id', element: <OnboardingWorkspace /> },
                { path: 'onboarding', element: <Onboarding /> },
              ]),
              guarded('partners', [
                { path: 'partners', element: <Partners /> },
                { path: 'partners/:id', element: <PartnerDetail /> },
              ]),
              guarded('partnerAccounts', [
                { path: 'partner-accounts', element: <PartnerAccounts /> },
                { path: 'partner-accounts/:id', element: <PartnerAccountDetail /> },
              ]),
              guarded('communications', [
                { path: 'communications', element: <Communications /> },
                { path: 'communications/emails', element: <CommEmails /> },
                { path: 'communications/templates', element: <CommTemplates /> },
                { path: 'communications/delivery', element: <CommDelivery /> },
                { path: 'communications/preferences', element: <CommPreferences /> },
                {
                  path: 'notification-templates',
                  element: <Navigate to="/admin/communications/templates" replace />,
                },
              ]),
              guarded('notifications', [{ path: 'notifications', element: <Notifications /> }]),
              guarded('content', contentRoutes),
              guarded('reports', reportRoutes),
              guarded('users', [
                { path: 'users', element: <Users /> },
                { path: 'users/:id', element: <UserDetail /> },
              ]),
              guarded('roles', [{ path: 'roles', element: <Roles /> }]),
              guarded('auditLogs', [
                { path: 'audit-logs', element: <AuditLogs /> },
                { path: 'audit-logs/:id', element: <AuditDetail /> },
              ]),
              guarded('governance', [{ path: 'governance', element: <Governance /> }]),
              guarded('settings', [
                { path: 'system-settings', element: <Settings /> },
                { path: 'system-settings/security', element: <SecuritySettings /> },
                { path: 'settings', element: <Navigate to="/admin/system-settings" replace /> },
              ]),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <AuthLayout />, children: [{ path: '*', element: <NotFoundPage /> }] },
])

export const AppRouter = () => <RouterProvider router={router} />
