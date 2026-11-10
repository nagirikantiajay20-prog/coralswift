import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PARTNER_NAVIGATION } from '../config/navigation'
import PartnerTeamPage from './PartnerTeamPage'

afterEach(() => useAuthStore.getState().clear())

describe('Phase 33 team page', () => {
  it('shows own account and unavailable state, with no API calls', () => {
    useAuthStore.getState().setPartner({
      id: 'p1',
      name: 'Pat',
      email: 'p@x.test',
      organizationId: 'o1',
      organizationName: 'Acme',
    })
    const spies = (['get', 'post', 'put', 'delete'] as const).map((m) => vi.spyOn(api, m))
    render(
      <MemoryRouter>
        <PartnerTeamPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Team management is not yet available')).toBeInTheDocument()
    expect(screen.getByText('p@x.test')).toBeInTheDocument()
    spies.forEach((s) => expect(s).not.toHaveBeenCalled())
    vi.restoreAllMocks()
  })
  it('has a nav entry', () => {
    expect(PARTNER_NAVIGATION.map((n) => n.to)).toContain('/partner/team')
  })
})
