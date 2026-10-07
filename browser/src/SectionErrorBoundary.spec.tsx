import React, { useState } from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import SectionErrorBoundary from './SectionErrorBoundary'

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

const SectionWithResettableKey = () => {
  const [geneId, setGeneId] = useState('ENSG00000012048')

  return (
    <>
      <button type="button" onClick={() => setGeneId('ENSG00000139618')}>
        Navigate to a different gene
      </button>
      <SectionErrorBoundary
        sectionName="Gene coverage"
        datasetId="gnomad_r4"
        entityDescription={`gene ${geneId}`}
        resetKeys={[geneId]}
      >
        <ComponentThatThrows shouldThrowError={geneId === 'ENSG00000012048'} />
      </SectionErrorBoundary>
    </>
  )
}

describe('SectionErrorBoundary', () => {
  test('renders children when nothing throws', () => {
    render(
      <BrowserRouter>
        <SectionErrorBoundary
          sectionName="Gene coverage"
          datasetId="gnomad_r4"
          entityDescription="gene BRCA1 (ENSG00000012048)"
          resetKeys={['ENSG00000012048', 'gnomad_r4']}
        >
          <ComponentThatThrows shouldThrowError={false} />
        </SectionErrorBoundary>
      </BrowserRouter>
    )

    expect(screen.getByText('Rendered without error')).toBeTruthy()
  })

  test('renders an inline, section-scoped fallback instead of the thrown error', () => {
    withSilencedConsoleError(() => {
      render(
        <BrowserRouter>
          <div>
            <div>Sibling section content</div>
            <SectionErrorBoundary
              sectionName="Gene coverage"
              datasetId="gnomad_r4"
              entityDescription="gene BRCA1 (ENSG00000012048)"
              resetKeys={['ENSG00000012048', 'gnomad_r4']}
            >
              <ComponentThatThrows shouldThrowError />
            </SectionErrorBoundary>
          </div>
        </BrowserRouter>
      )
    })

    expect(screen.getByText('Sibling section content')).toBeTruthy()
    expect(screen.getByText(/Something went wrong rendering Gene coverage/)).toBeTruthy()
    expect(screen.queryByText('Rendered without error')).toBeNull()
  })

  test('does not render the bug report form until the fallback button is clicked', () => {
    withSilencedConsoleError(() => {
      render(
        <BrowserRouter>
          <SectionErrorBoundary
            sectionName="Gene coverage"
            datasetId="gnomad_r4"
            entityDescription="gene BRCA1 (ENSG00000012048)"
            resetKeys={['ENSG00000012048', 'gnomad_r4']}
          >
            <ComponentThatThrows shouldThrowError />
          </SectionErrorBoundary>
        </BrowserRouter>
      )
    })

    expect(screen.queryByText('an issue on GitHub')).toBeNull()

    fireEvent.click(screen.getByText('Report this issue'))

    expect(screen.getByText('an issue on GitHub')).toBeTruthy()
  })

  test('bug report modal includes section name and entity description, and can be closed', () => {
    withSilencedConsoleError(() => {
      render(
        <BrowserRouter>
          <SectionErrorBoundary
            sectionName="Gene coverage"
            datasetId="gnomad_r4"
            entityDescription="gene BRCA1 (ENSG00000012048)"
            resetKeys={['ENSG00000012048', 'gnomad_r4']}
          >
            <ComponentThatThrows shouldThrowError />
          </SectionErrorBoundary>
        </BrowserRouter>
      )
    })

    fireEvent.click(screen.getByText('Report this issue'))

    const issueLink = screen.getByText('an issue on GitHub').closest('a')
    const decodedBody = decodeURIComponent(issueLink?.getAttribute('href') ?? '')

    expect(decodedBody).toContain('**Section**: Gene coverage')
    expect(decodedBody).toContain('gene BRCA1 (ENSG00000012048)')
    expect(decodedBody).toContain('dataset: gnomad_r4')

    fireEvent.click(screen.getByLabelText('Close'))

    expect(screen.queryByText('an issue on GitHub')).toBeNull()
  })

  test('attempts to render children again after resetKeys change', () => {
    render(
      <BrowserRouter>
        <SectionWithResettableKey />
      </BrowserRouter>
    )

    withSilencedConsoleError(() => {
      expect(screen.getByText(/Something went wrong rendering Gene coverage/)).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Navigate to a different gene'))

    expect(screen.getByText('Rendered without error')).toBeTruthy()
    expect(screen.queryByText(/Something went wrong rendering Gene coverage/)).toBeNull()
  })
})
