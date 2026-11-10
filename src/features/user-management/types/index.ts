import type { Role } from '@/config/permissions'
import type { ApiList } from '@/features/dashboard/types'

export type { ApiList }

/** Backend `StaffOut`. `status` is an untyped string in the spec; no created/updated dates or contact fields exist. */
export interface StaffOut {
  id: string
  email: string
  full_name: string
  staff_role: Role | null
  status: string
  mfa_enabled: boolean
  last_login_at: string | null
}

export interface InviteBody {
  email: string
  full_name: string
  role: Role
}

export type UserSort = 'name' | 'email' | 'role' | 'status' | 'last_login'

export interface UserFilters {
  search: string
  role: Role | 'all'
  status: string
  sort: UserSort
}
