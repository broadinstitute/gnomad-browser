import React from 'react'
import { describe, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import ExactTrAltMotifStructure from './ExactTrAltMotifStructure'

describe('selected ALT motif structure', () => {
  test('renders the shared motif grid without assigned-copy semantics', () => {
    render(
      <ExactTrAltMotifStructure refAllele="ATCCATCCA" altAllele="ATCCATCCATCCA" motifs={['TCCA']} />
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Selected ALT Motif Structure' })
    ).not.toBeNull()
    expect(screen.getByLabelText('Selected ALT motif structure grid')).not.toBeNull()
    expect(screen.getByText(/shared VCF anchor base is omitted/)).not.toBeNull()
    expect(screen.getAllByText('TCCA')).not.toHaveLength(0)
    expect(screen.queryByText('Assigned copies')).toBeNull()

    fireEvent.click(screen.getByTitle('Show sequence'))
    expect(screen.getByText(/12bp/)).not.toBeNull()
  })

  test('renders one complete selectable highlighted ALT including its neutral shared anchor', () => {
    const alt = 'ACAGCAGT'
    render(
      <ExactTrAltMotifStructure
        refAllele="ACAG"
        altAllele={alt}
        motifs={['CAG']}
        showHighlightedExactSequence
      />
    )

    const highlighted = screen.getByLabelText('Complete motif-highlighted exact ALT sequence')
    expect(highlighted.textContent).toContain(alt)
    expect(screen.getByTestId('motif-highlighted-sequence-text').textContent).toBe(alt)
    expect(screen.getByLabelText('Shared VCF anchor, 1 bp').textContent).toBe('A')
    expect(screen.getByText(/Gray leading base: shared VCF anchor/)).not.toBeNull()
    expect(screen.queryByTitle('Show sequence')).toBeNull()
    expect(screen.queryByLabelText('Show all allele sequences')).toBeNull()
  })

  test('explains scope and decomposition terminology accessibly', () => {
    render(<ExactTrAltMotifStructure refAllele="ACAG" altAllele="ACAGCAG" motifs={['CAG']} />)

    fireEvent.click(screen.getByLabelText('About the selected ALT motif structure'))
    expect(screen.getByText(/only the exact nucleotide sequence of the selected/)).not.toBeNull()
    expect(screen.getByText(/not a carrier, genotype, or full-cohort distribution/)).not.toBeNull()
    expect(screen.getByText(/dynamic-programming alignment/)).not.toBeNull()
    expect(screen.getByText(/descriptive and should not be interpreted as clinical/)).not.toBeNull()
  })

  test('shows bounded unavailable states for missing motifs and symbolic ALTs', () => {
    const { rerender } = render(
      <ExactTrAltMotifStructure refAllele="A" altAllele="ACAG" motifs={null} />
    )
    expect(screen.getByText(/no repeat motif was provided/)).not.toBeNull()
    expect(screen.queryByLabelText('Selected ALT motif structure grid')).toBeNull()

    rerender(<ExactTrAltMotifStructure refAllele="A" altAllele="<TR>" motifs={['CAG']} />)
    expect(screen.getByText(/does not provide an exact nucleotide ALT sequence/)).not.toBeNull()
    expect(screen.queryByLabelText('Selected ALT motif structure grid')).toBeNull()
  })
})
