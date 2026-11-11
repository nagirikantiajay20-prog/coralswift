import { useQueryClient } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { AppProviders } from './AppProviders'

describe('AppProviders', () => {
  it('drops cached API data when the session ends', () => {
    let qc!: ReturnType<typeof useQueryClient>
    const Grab = () => ((qc = useQueryClient()), null)
    render(
      <AppProviders>
        <Grab />
      </AppProviders>,
    )
    act(() => useAuthStore.getState().setTokens('a', 'r'))
    qc.setQueryData(['x'], 1)
    act(() => useAuthStore.getState().clear())
    expect(qc.getQueryData(['x'])).toBeUndefined()
  })
})
