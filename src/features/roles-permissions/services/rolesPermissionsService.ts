import { NotConfiguredError } from '@/services/api/errors'

/**
 * Service boundary for the roles-permissions module.
 * Endpoints, payloads and responses are PENDING the backend API specification; nothing is invented here.
 */
export const rolesPermissionsService = {
  list(): Promise<never> {
    return Promise.reject(new NotConfiguredError('RolesPermissions API'))
  },
}
