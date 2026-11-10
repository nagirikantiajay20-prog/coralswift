import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import EnquiryDetailPage from './EnquiryDetailPage'

vi.mock('../hooks/useEnquiries', () => ({
  useEnquiryDetail: () => ({
    isPending: false,
    isError: false,
    data: { enquiry: { id: 'e1', enquiry_type: 'strategic', reference_number: 'S-1' } },
  }),
  useEnquiryMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('strategic enquiry detail guard', () => {
  it('does not render a strategic record for a business development manager', () => {
    useAuthStore.setState({
      user: { id: 'u', name: 'T', email: 't@x.test', role: 'business_development_manager' },
    })
    render(
      <MemoryRouter>
        <EnquiryDetailPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Restricted record')).toBeTruthy()
    expect(screen.queryByText('S-1')).toBeNull()
  })
})
