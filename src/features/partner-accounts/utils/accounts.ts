import type { AccountAction } from '@/config/endpoints'
import { APPROVED_STATUSES } from '@/features/onboarding/types'
import type { PartnerApplicationLink } from '@/features/partner-management/types'
import type { AccountEvent, AuditRow, Capability } from '../types'

/** Result of inspecting openapi.json (2026-11-10). Nothing here is simulated in the UI. */
export const CAPABILITIES: Capability[] = [
  {
    operation: 'Provision account (invitation)',
    support: 'verified',
    detail:
      'POST /api/v1/reviewer/invitations — super administrator only; 201 {organization_id}; 409 on conflict. Invitation-only, no self-registration.',
  },
  {
    operation: 'Activation / credentials',
    support: 'verified',
    detail:
      'POST /api/v1/auth/invitations/accept — partner opens the emailed link and sets their own password. No password or token is handled by the console.',
  },
  {
    operation: 'Password reset',
    support: 'verified',
    detail:
      'POST /api/v1/auth/password-reset/request|confirm — partner self-service only; no admin-initiated reset.',
  },
  {
    operation: 'Organization audit trail',
    support: 'verified',
    detail:
      'GET /api/v1/admin/audit?organization_id= — super administrator only. Event names are backend-defined.',
  },
  {
    operation: 'List / search partner accounts',
    support: 'verified',
    detail: 'GET /api/v1/admin/accounts?user_type=partner — read-only directory in this console.',
  },
  {
    operation: 'Account details, last login',
    support: 'verified',
    detail:
      'Status, invitation state, MFA and last login come from the account list. A detail endpoint exists but is not wired. Partner roles are not defined.',
  },
  {
    operation: 'Invitation status (read)',
    support: 'verified',
    detail:
      'invitation_state in the account list. Resend/revoke endpoints exist in the backend but are not wired in this console yet.',
  },
  {
    operation: 'Account suspend / reactivate / resend / revoke',
    support: 'verified',
    detail:
      'POST /api/v1/admin/accounts/{id}/suspend|reactivate|invitation/resend|invitation/revoke from the account directory, each behind a confirmation. Organization-level suspend/reactivate remains in the Partners module.',
  },
  {
    operation: 'Role / access management',
    support: 'missing',
    detail: 'POST /admin/users/{id}/role changes staff roles only; never used for partners.',
  },
]

export interface AccountActionDef {
  action: AccountAction
  label: string
  title: string
  description: string
  destructive?: boolean
}

const ACTIONS: Record<AccountAction, AccountActionDef> = {
  'invitation/resend': {
    action: 'invitation/resend',
    label: 'Resend invite',
    title: 'Resend invitation?',
    description:
      'A fresh invitation link is emailed to the partner and any older link stops working. Resending is rate limited.',
  },
  'invitation/revoke': {
    action: 'invitation/revoke',
    label: 'Revoke invite',
    title: 'Revoke invitation?',
    description: 'The open invitation is cancelled. The account stays un-activated.',
    destructive: true,
  },
  suspend: {
    action: 'suspend',
    label: 'Suspend',
    title: 'Suspend this account?',
    description: 'The partner user is signed out everywhere and cannot sign in until reactivated.',
    destructive: true,
  },
  reactivate: {
    action: 'reactivate',
    label: 'Reactivate',
    title: 'Reactivate this account?',
    description:
      'Restores a suspended account. If the backend refuses because no password was ever set, send a new invitation instead.',
  },
}

/** Only actions that fit the account's state are offered; the backend still decides (403/404/422). */
export const actionsFor = (a: { status: string; invitation_state: string }): AccountActionDef[] => {
  if (a.status === 'invited')
    return a.invitation_state === 'revoked' || a.invitation_state === 'expired'
      ? [ACTIONS['invitation/resend']]
      : [ACTIONS['invitation/resend'], ACTIONS['invitation/revoke']]
  if (a.status === 'active') return [ACTIONS.suspend]
  if (a.status === 'deactivated') return [ACTIONS.reactivate]
  return []
}

/** Provisioning candidates: an application has reached an onboarding stage. Approval alone is not enough. */
export const inOnboarding = (status: string | null | undefined): boolean =>
  !!status && (APPROVED_STATUSES as string[]).includes(status)

export const onboardingApplications = (apps: PartnerApplicationLink[]) =>
  apps.filter((a) => inOnboarding(a.status))

export const toEvents = (rows: AuditRow[]): AccountEvent[] =>
  rows.map((r) => ({
    id: r.id,
    action: r.action,
    recordType: r.record_type,
    recordId: r.record_id,
    actorType: r.actor_type,
    actorUserId: r.actor_user_id,
    at: r.created_at,
  }))
