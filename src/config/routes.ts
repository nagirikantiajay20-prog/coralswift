export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  /** Public: confirms the email address of a privacy request (emailed link: /privacy/verify?token=..., confirmed by backend). */
  privacyVerify: '/privacy/verify',
  unauthorized: '/unauthorized',
  sessionExpired: '/session-expired',
  admin: '/admin',
  dashboard: '/admin/dashboard',
  profile: '/admin/profile',
  changePassword: '/admin/change-password',
} as const
