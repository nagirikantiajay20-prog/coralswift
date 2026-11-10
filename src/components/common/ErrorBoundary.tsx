import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './states'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // ponytail: console only; wire an error-monitoring service when one is chosen (PRD section 17).
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message="Something went wrong displaying this page."
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
