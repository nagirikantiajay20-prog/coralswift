/** Verified against openapi.json: TokenOut, MeOut, MfaEnrollOut, RecoveryCodesOut. */
export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}
export interface TokenOut {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  mfa_required: boolean
  mfa_enrollment_required: boolean
}
export interface MeOut {
  id: string
  email: string
  full_name: string
  user_type: 'partner' | 'staff'
  staff_role: string | null
  organization: { id: string; legal_name: string } | null
}
export interface MfaEnrollOut {
  secret: string
  otpauth_uri: string
}
