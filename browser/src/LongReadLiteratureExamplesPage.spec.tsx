import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import LongReadLiteratureExamplesPage from './LongReadLiteratureExamplesPage'
import examples from './data/longReadLiteratureExamples.json'
import { literatureWorkflowPath, literatureWorkflows } from './longReadLiteratureWorkflows'

describe('LongReadLiteratureExamplesPage', () => {
  test('renders literature links with LR browser context', () => {
    render(<LongReadLiteratureExamplesPage />)

    expect(
      screen.getByRole('heading', { name: 'Long Read Diagnostic Literature Examples' })
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: `All (${examples.length})` })).not.toBeNull()

    const example = examples.find((item) => item.region && item.pdfUrl)
    expect(example).toBeDefined()

    const card = screen.getByText(example!.title).parentElement!
    const links = within(card).getAllByRole('link')
    const browserLink = links.find((link) => link.textContent === 'View in browser')
    const pdfLink = links.find((link) => link.textContent === 'PDF')

    expect(browserLink?.getAttribute('href')).toBe(
      `/region/${example!.region!.chrom}-${example!.region!.start}-${
        example!.region!.stop
      }?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true`
    )
    expect(pdfLink?.getAttribute('href')).toBe(example!.pdfUrl)
  })

  test('links only the four curated prototype papers to detailed workflows', () => {
    render(<LongReadLiteratureExamplesPage />)

    const detailLinks = screen.getAllByRole('link', { name: 'Detailed workflow' })
    expect(detailLinks).toHaveLength(4)
    expect(detailLinks.map((link) => link.getAttribute('href')).sort()).toEqual(
      literatureWorkflows.map((workflow) => literatureWorkflowPath(workflow.slug)).sort()
    )
  })

  test('filters cards by their primary archetype', () => {
    render(<LongReadLiteratureExamplesPage />)

    const a1Example = examples.find((item) => item.archetype?.split('+')[0].trim() === 'A1')!
    const a6Example = examples.find((item) => item.archetype?.split('+')[0].trim() === 'A6')!

    fireEvent.click(screen.getByRole('button', { name: /^A1 — Repeat expansions/ }))

    expect(screen.getByText(a1Example.title)).not.toBeNull()
    expect(screen.queryByText(a6Example.title)).toBeNull()
  })
})
