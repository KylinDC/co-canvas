import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './ErrorBoundary'

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render error UI when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText('An unexpected error occurred in the application')
    ).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('should display error message in alert', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('should display technical details in collapsible section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Technical Details')).toBeInTheDocument()
    const detailsElement = screen.getByText('Technical Details')
      .parentElement as HTMLDetailsElement
    expect(detailsElement.tagName).toBe('DETAILS')
  })

  it('should display error stack trace', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const preElement = document.querySelector('pre')
    expect(preElement).toBeInTheDocument()
    expect(preElement?.textContent).toContain('Error: Test error')
  })

  it('should render Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.getByRole('button', { name: 'Try Again' })
    ).toBeInTheDocument()
  })

  it('should render Reload Page button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.getByRole('button', { name: 'Reload Page' })
    ).toBeInTheDocument()
  })

  it('should reset error state when Try Again is clicked', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    shouldThrow = false
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
    await user.click(tryAgainButton)

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should reload page when Reload Page button is clicked', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    Object.defineProperty(window.location, 'reload', {
      value: reloadMock,
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: 'Reload Page' })
    await user.click(reloadButton)

    expect(reloadMock).toHaveBeenCalled()
  })

  it('should use custom fallback if provided', () => {
    const customFallback = (error: Error, resetError: () => void) => (
      <div>
        <h1>Custom Error UI</h1>
        <p>{error.message}</p>
        <button onClick={resetError} type='button'>
          Custom Reset
        </button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Custom Reset' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should call custom fallback with error and reset function', () => {
    const fallbackMock = vi.fn((error: Error, resetError: () => void) => (
      <div>
        <span>{error.message}</span>
        <button onClick={resetError} type='button'>
          Reset
        </button>
      </div>
    ))

    render(
      <ErrorBoundary fallback={fallbackMock}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(fallbackMock).toHaveBeenCalled()
    const [error, resetError] = fallbackMock.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Test error')
    expect(typeof resetError).toBe('function')
  })

  it('should log error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle errors with long stack traces', () => {
    const LongStackError = () => {
      throw new Error('Error with long stack trace'.repeat(50))
    }

    render(
      <ErrorBoundary>
        <LongStackError />
      </ErrorBoundary>
    )

    const preElement = document.querySelector('pre')
    expect(preElement).toBeInTheDocument()
    expect(preElement?.className).toContain('overflow-auto')
  })

  it('should handle multiple sequential errors', () => {
    let shouldThrow = true

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    shouldThrow = false
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    shouldThrow = true
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
