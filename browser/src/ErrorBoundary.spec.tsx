import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import ErrorBoundary from './ErrorBoundary'

const ComponentThatThrows = ({ shouldThrowError }: { shouldThrowError: boolean }) => {
  if (shouldThrowError) {
    throw new Error('Kaboom')
  }
  return <div>Rendered without error</div>
}

const withSilencedConsoleError = (fn: () => void) => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    fn()
  } finally {
    consoleErrorSpy.mockRestore()
  }
}

describe('ErrorBoundary', () => {
  test('renders children when nothing throws', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ComponentThatThrows shouldThrowError={false} />
        </ErrorBoundary>
      </BrowserRouter>
    )

    expect(screen.getByText('Rendered without error')).toBeTruthy()
    expect(screen.queryByText('Something Went Wrong')).toBeNull()
  })

  test('renders the full-page fallback instead of the thrown error', () => {
    withSilencedConsoleError(() => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ComponentThatThrows shouldThrowError />
          </ErrorBoundary>
        </BrowserRouter>
      )
    })

    expect(screen.getByText('Something Went Wrong')).toBeTruthy()
    expect(screen.queryByText('Rendered without error')).toBeNull()
  })

  test('fallback includes the error message and links to file a report', () => {
    withSilencedConsoleError(() => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ComponentThatThrows shouldThrowError />
          </ErrorBoundary>
        </BrowserRouter>
      )
    })

    const issueLink = screen.getByText('an issue on GitHub').closest('a')
    const forumLink = screen.getByText('a topic on our forum').closest('a')
    const emailLink = screen.getByText('email us').closest('a')

    expect(issueLink?.getAttribute('href')).toContain('github.com/broadinstitute/gnomad-browser')
    expect(issueLink?.getAttribute('href')).toContain(encodeURIComponent('Kaboom'))
    expect(forumLink?.getAttribute('href')).toContain('discuss.gnomad.broadinstitute.org')
    expect(emailLink?.getAttribute('href')).toContain('mailto:gnomad@broadinstitute.org')
  })

  test('includes the user-entered bug description in the filed report', () => {
    withSilencedConsoleError(() => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ComponentThatThrows shouldThrowError />
          </ErrorBoundary>
        </BrowserRouter>
      )
    })

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'I clicked the coverage track' },
    })

    const issueLink = screen.getByText('an issue on GitHub').closest('a')
    expect(issueLink?.getAttribute('href')).toContain(
      encodeURIComponent('I clicked the coverage track')
    )
  })
})
