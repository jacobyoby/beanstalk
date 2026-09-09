import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function ThrowOnRender({ message = 'Test error' }: { message?: string }): React.ReactElement {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Hello')).toBeTruthy()
  })

  it('renders error UI when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Boom" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Boom')).toBeTruthy()
    spy.mockRestore()
  })

  it('renders retry button', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>
    )
    expect(screen.getByText('Try again')).toBeTruthy()
    spy.mockRestore()
  })

  it('retries rendering when retry button clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    function MaybeThrow(): React.ReactElement {
      if (shouldThrow) throw new Error('Oops')
      return <div>Recovered</div>
    }
    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    shouldThrow = false
    fireEvent.click(screen.getByText('Try again'))
    expect(screen.getByText('Recovered')).toBeTruthy()
    spy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallback={<div>Custom error page</div>}>
        <ThrowOnRender />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom error page')).toBeTruthy()
    expect(screen.queryByText('Something went wrong')).toBeNull()
    spy.mockRestore()
  })
})
